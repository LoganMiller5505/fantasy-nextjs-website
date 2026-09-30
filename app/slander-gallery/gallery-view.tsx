'use client'

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { GalleryItem } from "@/lib/gallery"
import { FacetFilter } from "./facet-filter"
import { GalleryPreview, GalleryTile } from "./gallery-tile"

const uniq = (xs: (string | undefined)[]) =>
  [...new Set(xs.filter((x): x is string => Boolean(x)))].sort()

export function GalleryView({ items }: { items: GalleryItem[] }) {
  const [people, setPeople] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [creators, setCreators] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [openIndex, setOpenIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)

  const peopleOptions = uniq(items.flatMap((i) => i.people))
  const typeOptions = uniq(items.map((i) => i.type))
  const creatorOptions = uniq(items.map((i) => i.creator))
  const yearOptions = uniq(items.map((i) => i.date.slice(0, 4))).reverse()

  // Within People: item must include every selected person. Type/Creator/Year: any selected. Across filters: AND.
  const visible = items
    .filter((i) => people.length === 0 || people.every((p) => i.people.includes(p)))
    .filter((i) => types.length === 0 || types.includes(i.type))
    .filter((i) => creators.length === 0 || (i.creator !== undefined && creators.includes(i.creator)))
    .filter((i) => years.length === 0 || years.includes(i.date.slice(0, 4)))
    .toSorted((a, b) => b.date.localeCompare(a.date))

  const hasFilters = people.length + types.length + creators.length + years.length > 0
  const clearFilters = () => {
    setPeople([])
    setTypes([])
    setCreators([])
    setYears([])
  }

  // Step through the filtered list, wrapping around at either end
  // (openIndex is kept after closing so the item stays rendered during the close animation)
  const openItem = visible[openIndex]
  const step = (delta: number) => setOpenIndex((i) => (i + delta + visible.length) % visible.length)

  const onPreviewKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLVideoElement) return // let a focused video use arrows to seek
    if (e.key === "ArrowLeft") step(-1)
    if (e.key === "ArrowRight") step(1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <FacetFilter label="About" options={peopleOptions} selected={people} onChange={setPeople} />
        <FacetFilter label="Type" options={typeOptions} selected={types} onChange={setTypes} />
        <FacetFilter label="Creator" options={creatorOptions} selected={creators} onChange={setCreators} />
        <FacetFilter label="Year" options={yearOptions} selected={years} onChange={setYears} />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
            <XIcon />
          </Button>
        )}
        <p className="ml-auto text-sm text-muted-foreground">
          Showing {visible.length} of {items.length}
        </p>
      </div>

      {visible.length > 0 ? (
        // Justified rows: each tile's flex-grow is its aspect ratio, so every row fills the width
        // at a shared height and nothing is cropped. The ::after spacer stops the last row stretching.
        <ul className="flex flex-wrap gap-2 [--row-h:140px] after:grow-[999] after:content-[''] sm:[--row-h:220px]">
          {visible.map((item, index) => {
            const ratio = item.width / item.height
            return (
              <li key={item.src} style={{ flexGrow: ratio, flexBasis: `calc(var(--row-h) * ${ratio})` }}>
                <GalleryTile item={item} onOpen={() => { setOpenIndex(index); setPreviewOpen(true) }} />
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">Nothing matches those filters.</p>
          <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-dvh sm:max-w-[95vw] lg:max-w-6xl" onKeyDown={onPreviewKeyDown}>
          {openItem && (
            <GalleryPreview item={openItem}>
              {visible.length > 1 && (
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
            </GalleryPreview>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
