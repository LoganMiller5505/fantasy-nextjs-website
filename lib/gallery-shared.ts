// Gallery types and lists used on both the server and in the browser

export const GALLERY_TYPES = ["meme", "text", "graphic", "espn", "video"] as const
export type GalleryType = (typeof GALLERY_TYPES)[number]

export type GalleryItem = {
  id: string
  kind: "image" | "video" | "youtube"
  title: string
  date: string // "YYYY-MM-DD"
  type: GalleryType
  creator?: string // manager name
  people: string[] // manager names
  hallOfFame: boolean
  width: number
  height: number
  thumb: string  // for the grid
  image?: string // full size: the image, or a video's poster
  video?: string // Blob URL
  videoId?: string // YouTube
}

// Video formats editors can upload (most browsers play QuickTime .mov files recorded as H.264)
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]
