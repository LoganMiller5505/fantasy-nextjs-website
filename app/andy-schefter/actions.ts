"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { POSTER_COOKIE, expectedPosterToken } from "@/lib/auth"
import { sql } from "@/lib/db"
import { isPoster } from "@/lib/poster"
import { MAX_UPLOAD_BYTES, normalizeImage } from "@/lib/tweet-images"
import { fillEngagement, nowCentral, type Counts } from "@/lib/tweets"

const PAGE = "/andy-schefter"
const MAX_TEXT = 1000
const MAX_IMAGES = 4
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function posterLogin(formData: FormData) {
  const password = process.env.TWEET_PASSWORD
  if (!password || formData.get("password") !== password) redirect(`${PAGE}/login?error=1`)

  ;(await cookies()).set(POSTER_COOKIE, (await expectedPosterToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  })
  redirect(PAGE)
}

export async function posterLogout() {
  ;(await cookies()).delete(POSTER_COOKIE)
}

export type PostState = { error?: string; ok?: boolean }

// Server functions can be called by a direct POST, so each one checks the poster cookie itself
export async function postTweet(_prev: PostState, formData: FormData): Promise<PostState> {
  if (!(await isPoster())) return { error: "You're not logged in to post." }

  const text = String(formData.get("text") ?? "").trim()
  if (text.length > MAX_TEXT) return { error: `Keep it to ${MAX_TEXT} characters.` }

  const date = String(formData.get("date") ?? "").trim() || nowCentral()
  if (!isValidDate(date)) return { error: "That date isn't valid." }

  const given: Counts = {}
  for (const key of ["replies", "retweets", "likes", "views"] as const) {
    const raw = String(formData.get(key) ?? "").trim()
    if (!raw) continue
    if (!/^\d{1,10}$/.test(raw) || Number(raw) > 2 ** 31 - 1) return { error: `${key[0].toUpperCase() + key.slice(1)} must be a whole number.` }
    given[key] = Number(raw)
  }
  const counts = fillEngagement(given)

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0)
  const alts = formData.getAll("alt").map((a) => String(a).trim().slice(0, MAX_TEXT))
  if (files.length > MAX_IMAGES) return { error: `Up to ${MAX_IMAGES} images.` }
  if (!text && files.length === 0) return { error: "Write something or add an image." }
  if (files.some((f) => f.size > MAX_UPLOAD_BYTES)) return { error: "Each image must be under 3 MB." }

  let images
  try {
    images = await Promise.all(files.map(normalizeImage))
  } catch {
    return { error: "One of the images couldn't be read." }
  }

  const tweetId = crypto.randomUUID()
  await sql.transaction([
    sql`insert into content.tweet (tweet_id, posted_at, text, replies, retweets, likes, views)
        values (${tweetId}, ${date}, ${text}, ${counts.replies}, ${counts.retweets}, ${counts.likes}, ${counts.views})`,
    ...images.map((image, position) => sql`
      insert into content.tweet_image (tweet_id, position, alt, width, height, mime, bytes)
      values (${tweetId}, ${position}, ${alts[position] || altFromName(files[position].name)},
              ${image.width}, ${image.height}, ${image.mime}, decode(${image.bytes.toString("base64")}, 'base64'))`),
  ])

  revalidatePath(PAGE)
  return { ok: true }
}

// Deleting only marks the tweet, so it can be undone with restoreTweet. Tweets deleted over a week ago
// are removed for good (with their images) whenever another is deleted.
export async function deleteTweet(id: string) {
  if (!(await isPoster())) throw new Error("Unauthorized")
  if (typeof id !== "string" || !UUID.test(id)) return
  await sql.transaction([
    sql`update content.tweet set deleted_at = now() where tweet_id = ${id} and deleted_at is null`,
    sql`delete from content.tweet where deleted_at < now() - interval '7 days'`,
  ])
  revalidatePath(PAGE)
}

export async function restoreTweet(id: string) {
  if (!(await isPoster())) throw new Error("Unauthorized")
  if (typeof id !== "string" || !UUID.test(id)) return
  await sql`update content.tweet set deleted_at = null where tweet_id = ${id}`
  revalidatePath(PAGE)
}

// "YYYY-MM-DDTHH:MM" that's a real calendar date (no Feb 30)
function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) return false
  const d = new Date(`${date}Z`)
  return !isNaN(d.getTime()) && d.toISOString().startsWith(date)
}

// "RobertLosing.png" → "Robert Losing", "dillon_relegation.jpg" → "dillon relegation"
function altFromName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim()
}
