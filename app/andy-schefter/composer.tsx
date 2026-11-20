'use client'

import { useActionState, useRef, useState, startTransition } from "react"
import Image from "next/image"
import { ChevronDown, ImagePlus, X } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { postTweet, type PostState } from "./actions"
import { TweetFields } from "./tweet-fields"

const MAX_TEXT = 1000
const MAX_IMAGES = 4
const MAX_BYTES = 3 * 1024 * 1024 // matches MAX_UPLOAD_BYTES on the server
const MAX_EDGE = 2048             // the server shrinks again to 1600; this just keeps uploads small

type Picked = { key: string; blob: Blob; name: string; url: string; alt: string }

export function Composer({ avatar }: { avatar: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState("")
  const [picked, setPicked] = useState<Picked[]>([])
  const [processing, setProcessing] = useState(false)
  const [pickError, setPickError] = useState<string>()

  // Called from onSubmit rather than <form action>, so a failed post doesn't reset what was typed
  const [state, post, pending] = useActionState(async (prev: PostState, formData: FormData) => {
    const result = await postTweet(prev, formData)
    if (result.ok) {
      formRef.current?.reset()
      setText("")
      setPicked((old) => { old.forEach((p) => URL.revokeObjectURL(p.url)); return [] })
    }
    return result
  }, {})

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setPickError(undefined)
    const room = MAX_IMAGES - picked.length
    const chosen = Array.from(files).slice(0, room)
    if (files.length > room) setPickError(`Up to ${MAX_IMAGES} images.`)

    setProcessing(true)
    for (const file of chosen) {
      try {
        const blob = await shrink(file)
        const p = { key: crypto.randomUUID(), blob, name: file.name, url: URL.createObjectURL(blob), alt: "" }
        setPicked((old) => [...old, p])
      } catch (e) {
        setPickError(e instanceof Error ? e.message : `Couldn't read ${file.name}.`)
      }
    }
    setProcessing(false)
  }

  function remove(key: string) {
    setPicked((old) => old.filter((p) => {
      if (p.key === key) URL.revokeObjectURL(p.url)
      return p.key !== key
    }))
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.delete("images")
    for (const p of picked) {
      formData.append("images", p.blob, p.name)
      formData.append("alt", p.alt)
    }
    startTransition(() => post(formData))
  }

  const tooLong = text.length > MAX_TEXT
  const canPost = !pending && !processing && !tooLong && (text.trim().length > 0 || picked.length > 0)
  const error = state.error ?? pickError

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex gap-3 border-b px-4 py-3">
      <Image src={avatar} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover" />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's the latest from league sources?"
          aria-label="Tweet text"
          className="min-h-20 resize-none border-0 bg-transparent! px-0 text-xl! shadow-none focus-visible:ring-0"
        />

        {picked.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {picked.map((p) => (
              <li key={p.key} className="flex flex-col gap-1">
                <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview */}
                  <img src={p.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => remove(p.key)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black/90"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <Input
                  value={p.alt}
                  onChange={(e) => setPicked((old) => old.map((o) => o.key === p.key ? { ...o, alt: e.target.value } : o))}
                  placeholder="Alt text"
                  aria-label={`Alt text for ${p.name}`}
                  className="h-7 text-xs!"
                />
              </li>
            ))}
          </ul>
        )}

        <Collapsible className="text-sm">
          <CollapsibleTrigger className="group flex items-center gap-1 text-muted-foreground hover:text-foreground">
            Date and counts
            <ChevronDown className="size-4 transition-transform group-data-[panel-open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="mt-2 text-xs text-muted-foreground">
              Leave any blank: the date defaults to today, and counts are made up to match the others.
            </p>
            <div className="mt-2"><TweetFields /></div>
          </CollapsibleContent>
        </Collapsible>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3 border-t pt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = "" }}
          />
          <button
            type="button"
            aria-label="Add images"
            disabled={picked.length >= MAX_IMAGES || processing}
            onClick={() => fileRef.current?.click()}
            className="rounded-full p-1.5 text-sky-500 transition-colors hover:bg-sky-500/10 disabled:opacity-40"
          >
            {processing ? <Spinner className="size-5" /> : <ImagePlus className="size-5" aria-hidden />}
          </button>

          <span className={cn("ml-auto text-sm tabular-nums text-muted-foreground", tooLong && "text-destructive")}>
            {text.length}/{MAX_TEXT}
          </span>
          <Button type="submit" disabled={!canPost} className="rounded-full bg-sky-500 px-4 font-bold text-white hover:bg-sky-600">
            {pending && <Spinner />}
            Post
          </Button>
        </div>
      </div>
    </form>
  )
}

// Shrinks a picked image so uploads stay small (Vercel caps request bodies at 4.5 MB). GIFs are sent as
// is so they stay animated.
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif") {
    if (file.size > MAX_BYTES) throw new Error(`${file.name} is over 3 MB.`)
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error(`Couldn't read ${file.name}.`)
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  let blob = await toBlob(canvas, "image/webp")
  // Browsers that can't encode WebP hand back PNG instead; JPEG is much smaller. JPEG has no
  // transparency, so redraw on white first.
  if (blob?.type !== "image/webp") {
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    blob = await toBlob(canvas, "image/jpeg")
  }
  bitmap.close()

  if (!blob) throw new Error(`Couldn't read ${file.name}.`)
  if (blob.size > MAX_BYTES) throw new Error(`${file.name} is too large even after shrinking.`)
  return blob
}

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
}
