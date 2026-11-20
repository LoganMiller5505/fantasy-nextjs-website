"use server"

import { del, head } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import { MAX_UPLOAD_BYTES, normalizeImage } from "@/lib/content-images"
import { sql } from "@/lib/db"
import { isEditor } from "@/lib/editor"
import { UUID, isValidDate, todayCentral } from "@/lib/forms"
import { GALLERY_TYPES, type GalleryType } from "@/lib/gallery-shared"

const PAGE = "/slander-gallery"
const FULL_EDGE = 2048
const THUMB_EDGE = 800
const MAX_TITLE = 200

export type GalleryState = { error?: string; ok?: boolean }

// Server functions can be called by a direct POST, so each one checks the editor cookie itself.

// Adds one item. The form carries exactly one of:
//   image             an image file (already shrunk in the browser)
//   video + poster    the Blob URL of a video the browser uploaded, its first-second frame, and its size
//   youtube           a YouTube link
export async function addGalleryItem(_prev: GalleryState, formData: FormData): Promise<GalleryState> {
  if (!(await isEditor())) return { error: "You're not logged in as an editor." }

  const fields = await readFields(formData)
  if ("error" in fields) return fields

  const image = file(formData, "image")
  const poster = file(formData, "poster")
  const videoUrl = String(formData.get("video") ?? "").trim()
  const youtubeLink = String(formData.get("youtube") ?? "").trim()

  let media: { kind: "image" | "video" | "youtube"; width: number; height: number; source?: File; video_url?: string; youtube_id?: string }
  if (image) {
    media = { kind: "image", source: image, width: 0, height: 0 }
  } else if (videoUrl) {
    if (!poster) return { error: "The video's poster frame is missing." }
    if (!(await isOurVideo(videoUrl))) return { error: "That video didn't upload properly. Try again." }
    const width = Number(formData.get("width"))
    const height = Number(formData.get("height"))
    if (!isSize(width) || !isSize(height)) return { error: "Couldn't tell the video's size." }
    media = { kind: "video", source: poster, video_url: videoUrl, width, height }
  } else if (youtubeLink) {
    const id = youtubeId(youtubeLink)
    if (!id) return { error: "That doesn't look like a YouTube link." }
    // Shorts are portrait; everything else is shown 16:9
    const portrait = /\/shorts\//.test(youtubeLink)
    media = { kind: "youtube", youtube_id: id, width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080 }
  } else {
    return { error: "Pick an image or video, or paste a YouTube link." }
  }

  let images: Awaited<ReturnType<typeof normalizeImage>>[] = []
  if (media.source) {
    if (media.source.size > MAX_UPLOAD_BYTES) return { error: "The image must be under 3 MB." }
    try {
      const input = Buffer.from(await media.source.arrayBuffer())
      images = await Promise.all([normalizeImage(input, FULL_EDGE), normalizeImage(input, THUMB_EDGE)])
    } catch {
      return { error: "That image couldn't be read." }
    }
    // An image is shown at the size it's stored at; a video at its own size
    if (media.kind === "image") Object.assign(media, { width: images[0].width, height: images[0].height })
  }

  const id = crypto.randomUUID()
  await sql.transaction([
    sql`
      insert into content.gallery_item (item_id, kind, title, posted_on, type, creator_id, hall_of_fame, width, height, video_url, youtube_id)
      values (${id}, ${media.kind}, ${fields.title}, ${fields.date}, ${fields.type},
              (select manager_id from league.manager where name = ${fields.creator}), ${fields.hallOfFame},
              ${media.width}, ${media.height}, ${media.video_url ?? null}, ${media.youtube_id ?? null})`,
    ...images.map((img, i) => sql`
      insert into content.gallery_image (item_id, size, mime, bytes)
      values (${id}, ${i === 0 ? "full" : "thumb"}, ${img.mime}, decode(${img.bytes.toString("base64")}, 'base64'))`),
    peopleInsert(id, fields.people),
  ])

  revalidatePath(PAGE)
  return { ok: true }
}

// Edits everything but the media
export async function updateGalleryItem(_prev: GalleryState, formData: FormData): Promise<GalleryState> {
  if (!(await isEditor())) return { error: "You're not logged in as an editor." }

  const id = String(formData.get("id") ?? "")
  if (!UUID.test(id)) return { error: "That item doesn't exist." }
  const fields = await readFields(formData)
  if ("error" in fields) return fields

  const [updated] = await sql.transaction([
    sql`
      update content.gallery_item
      set title = ${fields.title}, posted_on = ${fields.date}, type = ${fields.type}, hall_of_fame = ${fields.hallOfFame},
          creator_id = (select manager_id from league.manager where name = ${fields.creator})
      where item_id = ${id} and deleted_at is null
      returning item_id`,
    sql`delete from content.gallery_person where item_id = ${id}`,
    peopleInsert(id, fields.people),
  ])
  if (updated.length === 0) return { error: "That item doesn't exist." }

  revalidatePath(PAGE)
  return { ok: true }
}

// Deleting only marks the item, so it can be undone with restoreGalleryItem. Items deleted over a
// week ago are removed for good (with their images and video) whenever another is deleted.
export async function deleteGalleryItem(id: string) {
  if (!(await isEditor())) throw new Error("Unauthorized")
  if (typeof id !== "string" || !UUID.test(id)) return

  const [, purged] = await sql.transaction([
    sql`update content.gallery_item set deleted_at = now() where item_id = ${id} and deleted_at is null`,
    sql`delete from content.gallery_item where deleted_at < now() - interval '7 days' returning video_url`,
  ])
  // Preview deployments run on a copy of the database whose rows point at the same videos as
  // production, so only production (and local dev, which uses the main database) removes them
  const videos = purged.map((r) => r.video_url as string | null).filter((u): u is string => !!u)
  if (videos.length > 0 && process.env.VERCEL_ENV !== "preview") await del(videos)

  revalidatePath(PAGE)
}

export async function restoreGalleryItem(id: string) {
  if (!(await isEditor())) throw new Error("Unauthorized")
  if (typeof id !== "string" || !UUID.test(id)) return
  await sql`update content.gallery_item set deleted_at = null where item_id = ${id}`
  revalidatePath(PAGE)
}

// The fields shared by adding and editing
async function readFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { error: "Give it a title." }
  if (title.length > MAX_TITLE) return { error: `Keep the title to ${MAX_TITLE} characters.` }

  const date = String(formData.get("date") ?? "").trim() || todayCentral()
  if (!isValidDate(date)) return { error: "That date isn't valid." }

  const type = String(formData.get("type") ?? "") as GalleryType
  if (!GALLERY_TYPES.includes(type)) return { error: "Pick a type." }

  const managers = new Set((await sql`select name from league.manager`).map((r) => r.name as string))
  const creator = String(formData.get("creator") ?? "")
  if (creator && !managers.has(creator)) return { error: "Unknown creator." }
  const people = [...new Set(formData.getAll("people").map(String))]
  if (people.some((p) => !managers.has(p))) return { error: "Unknown person." }

  return { title, date, type, creator: creator || null, people, hallOfFame: formData.get("hallOfFame") === "on" }
}

function peopleInsert(id: string, people: string[]) {
  return sql`
    insert into content.gallery_person (item_id, manager_id)
    select ${id}, manager_id from league.manager where name = any(${people})`
}

function file(formData: FormData, name: string) {
  const f = formData.get(name)
  return f instanceof File && f.size > 0 ? f : null
}

const isSize = (n: number) => Number.isInteger(n) && n > 0 && n <= 20_000

// The URL must be a video in this project's Blob store, which head() (using our token) confirms
async function isOurVideo(url: string) {
  try {
    if (!new URL(url).hostname.endsWith(".public.blob.vercel-storage.com")) return false
    const blob = await head(url)
    return blob.pathname.startsWith("slander-gallery/") && blob.contentType.startsWith("video/")
  } catch {
    return false
  }
}

// youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
function youtubeId(link: string) {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m)\./, "")
  const id =
    host === "youtu.be" ? url.pathname.slice(1)
    : host === "youtube.com" || host === "youtube-nocookie.com"
      ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
      : null
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}
