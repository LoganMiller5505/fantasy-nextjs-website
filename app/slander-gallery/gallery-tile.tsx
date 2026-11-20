'use client'

import { useState } from "react"
import Image from "next/image"
import { cn } from "cn"
import { CrownIcon, PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { GalleryItem } from "@/lib/gallery-shared"

// Dates are plain "YYYY-MM-DD", so format in UTC to avoid shifting a day in US timezones
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })

export function GalleryTile({ item, onOpen }: { item: GalleryItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      style={{ aspectRatio: `${item.width} / ${item.height}` }}
    >
      {/* Thumbnails are already small WebPs, and the optimizer can't fetch images behind the password */}
      <Image
        src={item.thumb}
        alt={item.title}
        fill
        unoptimized
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
// Rendered with key={item.id}, so `loaded` resets for each item.
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
        <Image src={item.image!} alt={title} fill unoptimized className={mediaClass} onLoad={() => setLoaded(true)} />
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
          src={item.video}
          poster={item.image}
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

// Contents of the preview dialog. `children` is rendered over the media (used for the prev/next
// arrows); `actions` sits beside the title (the editor's edit and delete buttons).
export function GalleryPreview({ item, actions, children }: { item: GalleryItem; actions?: React.ReactNode; children?: React.ReactNode }) {
  const title = item.title

  return (
    <>
      <div className="flex flex-col gap-1 pr-8">
        <div className="flex items-start gap-2">
          <DialogTitle className="mr-auto">{title}</DialogTitle>
          {actions}
        </div>
        <DialogDescription>
          {dateFormat.format(new Date(item.date))}
          {item.creator && <span className="capitalize"> · by {item.creator}</span>}
        </DialogDescription>
      </div>

      <div className="relative flex min-h-0 items-center justify-center">
        <PreviewMedia key={item.id} item={item} title={title} />
        {children}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {item.hallOfFame && (
          <Badge className="bg-linear-to-b from-amber-300 to-amber-500 text-amber-950">
            <CrownIcon className="fill-current" />
            Hall of Fame
          </Badge>
        )}
        <Badge variant="outline" className="capitalize">{item.type === "espn" ? "ESPN" : item.type}</Badge>
        {item.people.map((person) => (
          <Badge key={person} variant="secondary" className="capitalize">{person}</Badge>
        ))}
      </div>
    </>
  )
}
