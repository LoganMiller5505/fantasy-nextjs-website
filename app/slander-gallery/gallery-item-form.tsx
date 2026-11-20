'use client'

import { useEffect, useRef, useState, useTransition } from "react"
import { upload } from "@vercel/blob/client"
import { ImagePlus, Link as LinkIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { drawToImage, shrinkImage } from "@/app/_components/shrink-image"
import { titleFromFileName, todayCentral } from "@/lib/forms"
import { GALLERY_TYPES, VIDEO_TYPES, type GalleryItem, type GalleryType } from "@/lib/gallery-shared"
import { addGalleryItem, updateGalleryItem, type GalleryState } from "./actions"

// A picked file, ready to send: an image shrunk for upload, or a video with its poster frame
type Picked =
  | { kind: "image"; file: File; blob: Blob; preview: string }
  | { kind: "video"; file: File; poster: Blob; width: number; height: number; preview: string }

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
// A pill around a native radio/checkbox, highlighted while checked
const pillClass =
  "cursor-pointer rounded-full border px-3 py-1 text-sm capitalize transition-colors select-none hover:bg-muted has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"

// Adds a new item (with its media), or edits one's details. Media can't be changed after adding.
export function GalleryItemForm({ item, managers, onDone }: { item?: GalleryItem; managers: string[]; onDone: () => void }) {
  const [source, setSource] = useState<"file" | "youtube">("file")
  const [picked, setPicked] = useState<Picked | null>(null)
  const [title, setTitle] = useState(item?.title ?? "")
  const [type, setType] = useState<GalleryType>(item?.type ?? "meme")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)

  // Free the preview's object URL when it's replaced or the form closes
  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.preview) }, [picked])

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    setStatus("Reading…")
    try {
      const next: Picked = file.type.startsWith("video/")
        ? { kind: "video", file, ...(await probeVideo(file)) }
        : { kind: "image", file, blob: await shrinkImage(file), preview: URL.createObjectURL(file) }
      setPicked(next)
      if (!title.trim()) setTitle(titleFromFileName(file.name))
      if (next.kind === "video") setType("video")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setStatus(null)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.delete("file")
    setError(null)

    startTransition(async () => {
      let result: GalleryState
      try {
        if (item) {
          formData.set("id", item.id)
          result = await updateGalleryItem({}, formData)
        } else {
          if (source === "youtube") {
            // sent as typed
          } else if (picked?.kind === "image") {
            formData.set("image", picked.blob, picked.file.name)
          } else if (picked?.kind === "video") {
            setStatus("Uploading video…")
            const blob = await upload(`slander-gallery/${safeName(picked.file.name)}`, picked.file, {
              access: "public",
              handleUploadUrl: "/slander-gallery/blob",
              multipart: picked.file.size > 8 * 1024 * 1024,
              onUploadProgress: ({ percentage }) => setStatus(`Uploading video… ${Math.round(percentage)}%`),
            })
            setStatus("Saving…")
            formData.set("video", blob.url)
            formData.set("poster", picked.poster, "poster.webp")
            formData.set("width", String(picked.width))
            formData.set("height", String(picked.height))
          } else {
            setError("Pick an image or video first.")
            return
          }
          result = await addGalleryItem({}, formData)
        }
      } catch (e) {
        result = { error: (e as Error).message || "Something went wrong." }
      }
      setStatus(null)
      if (result.error) setError(result.error)
      else onDone()
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="flex flex-col gap-1 pr-8">
        <DialogTitle>{item ? "Edit details" : "Add to the gallery"}</DialogTitle>
        <DialogDescription>
          {item ? "The image or video itself can't be changed. Delete and re-add it to replace it." : "An image, a video, or a YouTube link."}
        </DialogDescription>
      </div>

      {!item && (
        <div className="flex flex-col gap-2">
          <div role="tablist" className="inline-flex w-fit rounded-lg bg-muted p-[3px] text-sm">
            {(["file", "youtube"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={source === s}
                onClick={() => { setSource(s); if (s === "youtube") setType("video") }}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-1", source === s ? "bg-background shadow-sm" : "text-muted-foreground")}
              >
                {s === "file" ? <><ImagePlus className="size-4" /> Upload</> : <><LinkIcon className="size-4" /> YouTube link</>}
              </button>
            ))}
          </div>

          {source === "file" ? (
            <>
              <input
                ref={fileInput}
                type="file"
                name="file"
                accept={["image/*", ...VIDEO_TYPES].join(",")}
                className="sr-only"
                aria-label="Image or video"
                onChange={(e) => pick(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="grid min-h-40 place-items-center overflow-hidden rounded-lg border border-dashed bg-muted/50 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                {picked ? (
                  picked.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a local object URL
                    <img src={picked.preview} alt="" className="max-h-64 object-contain" />
                  ) : (
                    <video src={picked.preview} muted playsInline className="max-h-64" />
                  )
                ) : status ? (
                  <span className="flex items-center gap-2"><Spinner /> {status}</span>
                ) : (
                  <span className="flex flex-col items-center gap-1"><ImagePlus className="size-6" /> Choose an image or video</span>
                )}
              </button>
              {picked && <p className="text-xs text-muted-foreground">{picked.file.name} · click to change</p>}
            </>
          ) : (
            <Input name="youtube" type="url" placeholder="https://www.youtube.com/watch?v=…" required aria-label="YouTube link" />
          )}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Title</span>
        <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Date</span>
          <Input type="date" name="date" defaultValue={item?.date ?? todayCentral()} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Made by</span>
          <select name="creator" defaultValue={item?.creator ?? ""} className={selectClass}>
            <option value="">Unknown</option>
            {managers.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs text-muted-foreground">Type</legend>
        <div className="flex flex-wrap gap-1.5">
          {GALLERY_TYPES.map((t) => (
            <label key={t} className={pillClass}>
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              {t === "espn" ? "ESPN" : t}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs text-muted-foreground">About</legend>
        <div className="flex flex-wrap gap-1.5">
          {managers.map((m) => (
            <label key={m} className={pillClass}>
              <input type="checkbox" name="people" value={m} defaultChecked={item?.people.includes(m)} className="sr-only" />
              {m}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="hallOfFame" defaultChecked={item?.hallOfFame} className="size-4 accent-amber-500" />
        Hall of Fame
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        {pending && status && <span className="mr-auto text-sm text-muted-foreground" aria-live="polite">{status}</span>}
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>Cancel</Button>
        <Button type="submit" disabled={pending || (!item && source === "file" && !picked)}>
          {pending && <Spinner />}
          {item ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  )
}

// A video's size and a poster from about a second in (or halfway, for very short clips). Fails for
// formats this browser can't play, which the gallery couldn't show anyway.
async function probeVideo(file: File) {
  const preview = URL.createObjectURL(file)
  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.preload = "auto"
  try {
    const ready = once(video, "loadeddata")
    video.src = preview
    await ready
    if (!video.videoWidth) throw new Error()
    const seeked = once(video, "seeked")
    video.currentTime = Math.min(1, (video.duration || 0) / 2)
    await seeked
    const poster = await drawToImage(video, video.videoWidth, video.videoHeight, file.name)
    return { poster, width: video.videoWidth, height: video.videoHeight, preview }
  } catch {
    URL.revokeObjectURL(preview)
    throw new Error(`This browser can't play ${file.name}. Try an MP4.`)
  }
}

// Resolves on `event`; rejects on an error, or if nothing happens for 15 seconds (some browsers
// just stall on a codec they can't decode)
function once(el: HTMLMediaElement, event: string) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error()), 15_000)
    el.addEventListener(event, () => { clearTimeout(timer); resolve() }, { once: true })
    el.addEventListener("error", () => { clearTimeout(timer); reject(new Error()) }, { once: true })
  })
}

// Blob pathnames: letters, digits, dots and dashes only
function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "") || "video"
}
