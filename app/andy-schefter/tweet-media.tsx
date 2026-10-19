'use client'

import { useState } from "react"
import Image from "next/image"
import { cn } from "cn"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { TweetImage } from "@/lib/andy-schefter"

// Twitter's grids: one image keeps its shape (cropped if very tall); 2–4 share a 16:9 box.
// With three, the first fills the left column and the other two stack on the right.
const gridClass = {
  2: "aspect-video grid-cols-2",
  3: "aspect-video grid-cols-2 grid-rows-2 [&>:first-child]:row-span-2",
  4: "aspect-video grid-cols-2 grid-rows-2",
} as Record<number, string>

export function TweetMedia({ images }: { images: TweetImage[] }) {
  const shown = images.slice(0, 4)
  const [openIndex, setOpenIndex] = useState(0)
  const [open, setOpen] = useState(false)

  // openIndex is kept after closing so the image stays rendered during the close animation
  const openImage = shown[openIndex]
  const step = (delta: number) => setOpenIndex((i) => (i + delta + shown.length) % shown.length)

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") step(-1)
    if (e.key === "ArrowRight") step(1)
  }

  const single = shown.length === 1

  return (
    <>
      <div className={cn("mt-2 grid gap-0.5 overflow-hidden rounded-2xl border", gridClass[shown.length])}>
        {shown.map((image, index) => (
          <button
            key={image.src}
            onClick={() => { setOpenIndex(index); setOpen(true) }}
            className="relative block max-h-[510px] w-full overflow-hidden bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={single ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes={single ? "(max-width: 640px) 100vw, 520px" : "(max-width: 640px) 50vw, 260px"}
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-dvh sm:max-w-[95vw] lg:max-w-6xl" onKeyDown={onKeyDown}>
          {openImage && (
            <>
              <DialogTitle className="sr-only">{openImage.alt || "Image"}</DialogTitle>
              <div className="relative flex min-h-0 items-center justify-center">
                <PreviewImage key={openImage.src} image={openImage} />
                {shown.length > 1 && (
                  <>
                    <Button variant="secondary" size="icon" aria-label="Previous"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                      onClick={() => step(-1)}>
                      <ChevronLeftIcon />
                    </Button>
                    <Button variant="secondary" size="icon" aria-label="Next"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                      onClick={() => step(1)}>
                      <ChevronRightIcon />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Box is sized from the stored dimensions so it's final before the image loads; spinner shows until then.
// Rendered with key={image.src}, so `loaded` resets for each image.
function PreviewImage({ image }: { image: TweetImage }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className="relative overflow-hidden rounded-md bg-muted"
      style={{
        aspectRatio: `${image.width} / ${image.height}`,
        width: `min(100%, ${image.width}px, calc((100dvh - 6rem) * ${image.width / image.height}))`,
      }}
    >
      {!loaded && <Spinner className="absolute inset-0 m-auto size-8 text-muted-foreground" />}
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="95vw"
        className={cn("size-full object-contain transition-opacity", !loaded && "opacity-0")}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
