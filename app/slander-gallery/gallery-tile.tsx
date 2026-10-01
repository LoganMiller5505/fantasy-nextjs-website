'use client'

import { useState } from "react"
import Image from "next/image"
import { cn } from "cn"
import { PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { GalleryItem } from "@/lib/gallery"
import { keyOf, posterOf } from "@/lib/gallery"

// "/slander-gallery/MarkAndrewsMissing.jpg" -> "Mark Andrews Missing"
function titleFromSrc(src: string) {
  const name = src.split("/").pop()!.replace(/\.[^.]+$/, "")
  return name.replace(/([a-z])([A-Z])/g, "$1 $2")
}

const titleOf = (item: GalleryItem) => item.alt || titleFromSrc(keyOf(item))

// Dates are plain "YYYY-MM-DD", so format in UTC to avoid shifting a day in US timezones
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })

export function GalleryTile({ item, onOpen }: { item: GalleryItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      style={{ aspectRatio: `${item.width} / ${item.height}` }}
    >
      <Image
        src={posterOf(item)}
        alt={titleOf(item)}
        fill
        sizes="(max-width: 640px) 100vw, 40vw"
        className="object-cover transition-transform duration-200 group-hover:scale-105"
      />
      {item.kind !== "image" && (
        <span className="absolute inset-0 grid place-items-center bg-black/20">
          <PlayIcon className="size-10 fill-white text-white drop-shadow" />
        </span>
      )}
    </button>
  )
}

// Box is sized from the stored dimensions so it's final before the media loads; spinner shows until then.
// Rendered with key={keyOf(item)}, so `loaded` resets for each item.
function PreviewMedia({ item, title }: { item: GalleryItem; title: string }) {
  const [loaded, setLoaded] = useState(false)
  const mediaClass = cn("size-full object-contain transition-opacity", !loaded && "opacity-0")

  return (
    <div
      className="relative overflow-hidden rounded-md bg-muted"
      style={{
        aspectRatio: `${item.width} / ${item.height}`,
        width: `min(100%, ${item.width}px, calc((100dvh - 10rem) * ${item.width / item.height}))`,
      }}
    >
      {!loaded && <Spinner className="absolute inset-0 m-auto size-8 text-muted-foreground" />}
      {item.kind === "image" ? (
        <Image src={item.src} alt={title} fill sizes="95vw" className={mediaClass} onLoad={() => setLoaded(true)} />
      ) : item.kind === "youtube" ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1&playsinline=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className={mediaClass}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <video
          src={item.src}
          poster={posterOf(item)}
          controls
          autoPlay
          playsInline
          className={mediaClass}
          onLoadedData={() => setLoaded(true)}
        />
      )}
    </div>
  )
}

// Contents of the preview dialog. `children` is rendered over the media (used for the prev/next arrows).
export function GalleryPreview({ item, children }: { item: GalleryItem; children?: React.ReactNode }) {
  const title = titleOf(item)

  return (
    <>
      <div className="flex flex-col gap-1 pr-8">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {dateFormat.format(new Date(item.date))}
          {item.creator && <span className="capitalize"> · by {item.creator}</span>}
        </DialogDescription>
      </div>

      <div className="relative flex min-h-0 items-center justify-center">
        <PreviewMedia key={keyOf(item)} item={item} title={title} />
        {children}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="capitalize">{item.type}</Badge>
        {item.people.map((person) => (
          <Badge key={person} variant="secondary" className="capitalize">{person}</Badge>
        ))}
      </div>
    </>
  )
}
