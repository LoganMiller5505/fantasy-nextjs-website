import "server-only"
import { sql } from "@/lib/db"
import type { GalleryItem } from "@/lib/gallery-shared"

// The slander gallery: content.gallery_item and friends, added and edited on the site by editors.
// Images (and video posters) are stored in the database in two sizes and served by
// /slander-gallery/media/<id>; videos are too big for that and live in Vercel Blob.

export type { GalleryItem } from "@/lib/gallery-shared"

const MEDIA = "/slander-gallery/media/"

type Row = Omit<GalleryItem, "thumb" | "image" | "creator"> & { creator: string | null; thumb_id: string | null; full_id: string | null }

export async function getGallery(): Promise<GalleryItem[]> {
  const rows = (await sql`
    select i.item_id as id, i.kind, i.title, to_char(i.posted_on, 'YYYY-MM-DD') as date, i.type,
           c.name as creator, i.hall_of_fame as "hallOfFame", i.width, i.height,
           i.video_url as video, i.youtube_id as "videoId",
           (select image_id from content.gallery_image g where g.item_id = i.item_id and g.size = 'thumb') as thumb_id,
           (select image_id from content.gallery_image g where g.item_id = i.item_id and g.size = 'full') as full_id,
           array(select m.name from content.gallery_person p join league.manager m using (manager_id)
                 where p.item_id = i.item_id order by m.name) as people
    from content.gallery_item i
    left join league.manager c on c.manager_id = i.creator_id
    where i.deleted_at is null
    order by i.posted_on desc, i.created_at desc
  `) as Row[]

  return rows.map(({ thumb_id, full_id, creator, video, videoId, ...item }) => ({
    ...item,
    ...(creator && { creator }),
    ...(video && { video }),
    ...(videoId && { videoId }),
    thumb: thumb_id ? MEDIA + thumb_id : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    ...(full_id && { image: MEDIA + full_id }),
  }))
}

// Every manager who's ever played, for the creator and people pickers
export async function getManagerNames(): Promise<string[]> {
  return (await sql`select name from league.manager order by name`).map((r) => r.name as string)
}

export async function getGalleryImage(id: string) {
  const [row] = await sql`
    select g.mime, encode(g.bytes, 'base64') as bytes
    from content.gallery_image g join content.gallery_item i using (item_id)
    where g.image_id = ${id} and i.deleted_at is null
  `
  return row ? { mime: row.mime as string, bytes: Buffer.from(row.bytes as string, "base64") } : null
}
