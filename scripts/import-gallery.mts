// One-off: moves the hard-coded slander gallery (scripts/legacy-gallery.ts and the files in
// public/slander-gallery) into the database, with videos going to Vercel Blob. Run once per
// database, after db/04_rankings_gallery.sql:
//
//   DB=<direct Neon URL> BLOB_READ_WRITE_TOKEN=<token> pnpm dlx tsx --conditions=react-server scripts/import-gallery.mts
//
// (--conditions=react-server lets it import the site's server-only modules.) It refuses to run if
// the gallery already has items. Pass --local-videos to point videos at their old public/ paths
// instead of uploading them, for testing against a throwaway database.

import { readFile } from "node:fs/promises"
import path from "node:path"
import { neon, neonConfig } from "@neondatabase/serverless"
import { put } from "@vercel/blob"
import { normalizeImage } from "../lib/content-images"
import { titleFromFileName } from "../lib/forms"
import { GALLERY, legacyPosterOf } from "./legacy-gallery"

const PUBLIC = path.join(import.meta.dirname, "..", "public")
const localVideos = process.argv.includes("--local-videos")

// The old page showed YouTube items as "yt:<id>"; these are their YouTube titles
const YOUTUBE_TITLES: Record<string, string> = {
  "1y8Z5GJN3v8": "Matt Slander Video",
  "PGS5A_JeEjo": "Congrats, Landon!",
  "XvRy6cckuCk": "The Start of It Trial Run",
}

if (!process.env.DB) throw new Error("Set DB to a direct Neon connection string")
if (!localVideos && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Set BLOB_READ_WRITE_TOKEN (or pass --local-videos)")
// For a local Postgres behind Neon's HTTP proxy (local-neon-http-proxy)
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT
const sql = neon(process.env.DB)

const [{ count }] = await sql`select count(*)::int as count from content.gallery_item`
if (count > 0) throw new Error(`content.gallery_item already has ${count} items; not importing again`)

const managers = new Map((await sql`select manager_id, name from league.manager`).map((r) => [String(r.name).toLowerCase(), r.manager_id as number]))
const managerId = (name: string) => {
  const id = managers.get(name)
  if (id == null) throw new Error(`Unknown manager "${name}"`)
  return id
}

const counts = { image: 0, video: 0, youtube: 0 }
let bytes = 0

for (const [index, item] of GALLERY.entries()) {
  const id = crypto.randomUUID()
  const src = item.kind === "youtube" ? null : item.src
  const title = item.alt || (item.kind === "youtube" ? YOUTUBE_TITLES[item.videoId] : titleFromFileName(path.basename(src!)))
  if (!title) throw new Error(`No title for item ${index}`)

  // The image, or the video's poster (a YouTube item only has one if it was given)
  const imagePath = item.kind === "youtube" ? item.poster : legacyPosterOf(item)
  const images = imagePath
    ? await (async () => {
        const input = await readFile(path.join(PUBLIC, imagePath))
        return Promise.all([normalizeImage(input, 2048), normalizeImage(input, 800)])
      })()
    : []
  bytes += images.reduce((n, i) => n + i.bytes.length, 0)

  let videoUrl: string | null = null
  if (item.kind === "video") {
    if (localVideos) {
      videoUrl = item.src
    } else {
      const file = await readFile(path.join(PUBLIC, item.src))
      const contentType = item.src.endsWith(".mov") ? "video/quicktime" : item.src.endsWith(".webm") ? "video/webm" : "video/mp4"
      const blob = await put(`slander-gallery/${path.basename(item.src)}`, file, { access: "public", addRandomSuffix: true, contentType, multipart: true })
      videoUrl = blob.url
    }
  }

  // Images are shown at the size they're stored at; videos and YouTube at their own size
  const [width, height] = item.kind === "image" ? [images[0].width, images[0].height] : [item.width, item.height]

  await sql.transaction([
    // created_at steps back one second per item, so items on the same day keep the old file's order
    sql`
      insert into content.gallery_item (item_id, kind, title, posted_on, type, creator_id, hall_of_fame, width, height, video_url, youtube_id, created_at)
      values (${id}, ${item.kind}, ${title}, ${item.date}, ${item.type}, ${item.creator ? managerId(item.creator) : null},
              ${item.hallOfFame ?? false}, ${width}, ${height}, ${videoUrl}, ${item.kind === "youtube" ? item.videoId : null},
              now() - make_interval(secs => ${index}))`,
    ...images.map((img, i) => sql`
      insert into content.gallery_image (item_id, size, mime, bytes)
      values (${id}, ${i === 0 ? "full" : "thumb"}, ${img.mime}, decode(${img.bytes.toString("base64")}, 'base64'))`),
    ...[...new Set(item.people)].map((p) => sql`insert into content.gallery_person (item_id, manager_id) values (${id}, ${managerId(p)})`),
  ])

  counts[item.kind]++
  console.log(`${index + 1}/${GALLERY.length}  ${item.kind.padEnd(7)} ${title}`)
}

console.log(`\n${GALLERY.length} items imported: ${counts.image} images, ${counts.video} videos, ${counts.youtube} YouTube. ${(bytes / 1024 / 1024).toFixed(1)} MB of images.`)
