import "server-only"
import { sql } from "@/lib/db"
import type { Tweet } from "@/lib/andy-schefter"

const MEDIA = "/andy-schefter/media/"

// Every tweet, newest first. Image bytes stay in the database; each image is fetched from its own URL.
export async function getTweets(): Promise<Tweet[]> {
  return (await sql`
    select t.tweet_id as id,
           to_char(t.posted_on, 'YYYY-MM-DD') as date,
           t.text, t.replies, t.retweets, t.likes, t.views,
           coalesce(
             json_agg(json_build_object('src', ${MEDIA} || i.image_id, 'alt', i.alt, 'width', i.width, 'height', i.height)
                      order by i.position)
               filter (where i.image_id is not null),
             '[]') as images
    from content.tweet t
    left join content.tweet_image i using (tweet_id)
    where t.deleted_at is null
    group by t.tweet_id
    order by t.posted_on desc, t.created_at desc
  `) as Tweet[]
}

// One stored image, or null if there's no such id or its tweet was deleted
export async function getImage(id: string) {
  const [row] = await sql`
    select i.mime, encode(i.bytes, 'base64') as b64
    from content.tweet_image i join content.tweet t using (tweet_id)
    where i.image_id = ${id} and t.deleted_at is null
  `
  return row ? { mime: row.mime as string, bytes: Buffer.from(row.b64 as string, "base64") } : null
}

export type Counts = { replies?: number; retweets?: number; likes?: number; views?: number }

const MAX_INT = 2 ** 31 - 1
const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

// Fills in any counts left blank, in proportions like the real tweets: views 100k–4M, likes 0.7–3.5% of
// views, reposts 12–20% of likes, replies 2–6% of likes. The first count given (views, then likes,
// reposts, replies) sets the scale for the blank ones, so a big like count gets a big view count.
// Given counts are kept as is.
export function fillEngagement(given: Counts): Required<Counts> {
  const likeRate = between(0.007, 0.035)
  const perView = {
    views: 1,
    likes: likeRate,
    retweets: likeRate * between(0.12, 0.2),
    replies: likeRate * between(0.02, 0.06),
  }
  const anchor = (["views", "likes", "retweets", "replies"] as const).find((k) => given[k] !== undefined)
  const views = anchor ? given[anchor]! / perView[anchor] : 10 ** between(5, Math.log10(4_000_000))
  const fill = (k: keyof Counts) => given[k] ?? Math.min(MAX_INT, Math.round(views * perView[k]))

  return { replies: fill("replies"), retweets: fill("retweets"), likes: fill("likes"), views: fill("views") }
}
