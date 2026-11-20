"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import { isEditor } from "@/lib/editor"
import { UUID, isValidDate, titleFromFileName, todayCentral } from "@/lib/forms"
import { MAX_UPLOAD_BYTES, normalizeImage } from "@/lib/content-images"
import { fillEngagement, type Counts } from "@/lib/tweets"

const PAGE = "/andy-schefter"
const MAX_TEXT = 1000
const MAX_IMAGES = 4
const TWEET_IMAGE_EDGE = 1600

export type PostState = { error?: string; ok?: boolean }

// Server functions can be called by a direct POST, so each one checks the editor cookie itself
export async function postTweet(_prev: PostState, formData: FormData): Promise<PostState> {
  if (!(await isEditor())) return { error: "You're not logged in to post." }

  const fields = readFields(formData)
  if ("error" in fields) return fields
  const { text, date, counts } = fields

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0)
  const alts = formData.getAll("alt").map((a) => String(a).trim().slice(0, MAX_TEXT))
  if (files.length > MAX_IMAGES) return { error: `Up to ${MAX_IMAGES} images.` }
  if (!text && files.length === 0) return { error: "Write something or add an image." }
  if (files.some((f) => f.size > MAX_UPLOAD_BYTES)) return { error: "Each image must be under 3 MB." }

  let images
  try {
    images = await Promise.all(files.map((f) => normalizeImage(f, TWEET_IMAGE_EDGE)))
  } catch {
    return { error: "One of the images couldn't be read." }
  }

  const tweetId = crypto.randomUUID()
  await sql.transaction([
    sql`insert into content.tweet (tweet_id, posted_on, text, replies, retweets, likes, views)
        values (${tweetId}, ${date}, ${text}, ${counts.replies}, ${counts.retweets}, ${counts.likes}, ${counts.views})`,
    ...images.map((image, position) => sql`
      insert into content.tweet_image (tweet_id, position, alt, width, height, mime, bytes)
      values (${tweetId}, ${position}, ${alts[position] || titleFromFileName(files[position].name)},
              ${image.width}, ${image.height}, ${image.mime}, decode(${image.bytes.toString("base64")}, 'base64'))`),
  ])

  revalidatePath(PAGE)
  return { ok: true }
}

// Edits the text, date and counts. Images stay as they were posted.
export async function updateTweet(_prev: PostState, formData: FormData): Promise<PostState> {
  if (!(await isEditor())) return { error: "You're not logged in to post." }

  const id = String(formData.get("id") ?? "")
  if (!UUID.test(id)) return { error: "That tweet doesn't exist." }
  const fields = readFields(formData)
  if ("error" in fields) return fields
  const { text, date, counts } = fields

  const rows = await sql`
    update content.tweet
    set text = ${text}, posted_on = ${date},
        replies = ${counts.replies}, retweets = ${counts.retweets}, likes = ${counts.likes}, views = ${counts.views}
    where tweet_id = ${id} and deleted_at is null
      and (${text} <> '' or exists (select from content.tweet_image i where i.tweet_id = ${id}))
    returning tweet_id
  `
  if (rows.length === 0) return { error: text ? "That tweet doesn't exist." : "Write something." }

  revalidatePath(PAGE)
  return { ok: true }
}

// Deleting only marks the tweet, so it can be undone with restoreTweet. Tweets deleted over a week ago
// are removed for good (with their images) whenever another is deleted.
export async function deleteTweet(id: string) {
  if (!(await isEditor())) throw new Error("Unauthorized")
  if (typeof id !== "string" || !UUID.test(id)) return
  await sql.transaction([
    sql`update content.tweet set deleted_at = now() where tweet_id = ${id} and deleted_at is null`,
    sql`delete from content.tweet where deleted_at < now() - interval '7 days'`,
  ])
  revalidatePath(PAGE)
}

export async function restoreTweet(id: string) {
  if (!(await isEditor())) throw new Error("Unauthorized")
  if (typeof id !== "string" || !UUID.test(id)) return
  await sql`update content.tweet set deleted_at = null where tweet_id = ${id}`
  revalidatePath(PAGE)
}

// The fields shared by posting and editing. A blank date means today; blank counts are made up to
// match the others (fillEngagement).
function readFields(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim()
  if (text.length > MAX_TEXT) return { error: `Keep it to ${MAX_TEXT} characters.` }

  const date = String(formData.get("date") ?? "").trim() || todayCentral()
  if (!isValidDate(date)) return { error: "That date isn't valid." }

  const given: Counts = {}
  for (const key of ["replies", "retweets", "likes", "views"] as const) {
    const raw = String(formData.get(key) ?? "").trim()
    if (!raw) continue
    if (!/^\d{1,10}$/.test(raw) || Number(raw) > 2 ** 31 - 1) return { error: `${key[0].toUpperCase() + key.slice(1)} must be a whole number.` }
    given[key] = Number(raw)
  }
  return { text, date, counts: fillEngagement(given) }
}
