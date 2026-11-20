'use client'

import { useState, useTransition } from "react"
import { ChevronLeftIcon, ChevronRightIcon, Pencil, Plus, Trash2, XIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useOnDeleted } from "@/app/_components/undo-delete"
import type { GalleryItem } from "@/lib/gallery-shared"
import { deleteGalleryItem } from "./actions"
import { FacetFilter } from "./facet-filter"
import { GalleryItemForm } from "./gallery-item-form"
import { HallOfFameToggle } from "./hall-of-fame-toggle"
import { GalleryPreview, GalleryTile } from "./gallery-tile"

const uniq = (xs: (string | undefined)[]) =>
  [...new Set(xs.filter((x): x is string => Boolean(x)))].sort()

// `managers` is set for editors only, and turns on adding, editing and deleting
export function GalleryView({ items, managers }: { items: GalleryItem[]; managers?: string[] }) {
  const [people, setPeople] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [creators, setCreators] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [hallOfFame, setHallOfFame] = useState(false)
  // Tracked by id so the open item stays put if an edit re-sorts the list. Kept after closing so the
  // item stays rendered during the close animation.
  const [openId, setOpenId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleting, startDelete] = useTransition()
  const onDeleted = useOnDeleted()

  const peopleOptions = uniq(items.flatMap((i) => i.people))
  const typeOptions = uniq(items.map((i) => i.type))
  const creatorOptions = uniq(items.map((i) => i.creator))
  const yearOptions = uniq(items.map((i) => i.date.slice(0, 4))).reverse()

  // Within People: item must include every selected person. Type/Creator/Year: any selected. Across filters: AND.
  const visible = items
    .filter((i) => !hallOfFame || i.hallOfFame)
    .filter((i) => people.length === 0 || people.every((p) => i.people.includes(p)))
    .filter((i) => types.length === 0 || types.includes(i.type))
    .filter((i) => creators.length === 0 || (i.creator !== undefined && creators.includes(i.creator)))
    .filter((i) => years.length === 0 || years.includes(i.date.slice(0, 4)))
    .toSorted((a, b) => b.date.localeCompare(a.date))

  const hasFilters = hallOfFame || people.length + types.length + creators.length + years.length > 0
  const clearFilters = () => {
    setPeople([])
    setTypes([])
    setCreators([])
    setYears([])
    setHallOfFame(false)
  }

  // Step through the filtered list, wrapping around at either end
  const openIndex = visible.findIndex((i) => i.id === openId)
  const openItem = visible[openIndex]
  const step = (delta: number) => setOpenId(visible[(openIndex + delta + visible.length) % visible.length].id)

  const open = (id: string) => {
    setOpenId(id)
    setEditing(false)
    setPreviewOpen(true)
  }
  const remove = (id: string) =>
    startDelete(async () => {
      await deleteGalleryItem(id)
      setPreviewOpen(false)
      onDeleted(id)
    })

  const onPreviewKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return
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
        <HallOfFameToggle pressed={hallOfFame} onPressedChange={setHallOfFame} />
        {managers && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus />
            Add
          </Button>
        )}
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
          {visible.map((item) => {
            const ratio = item.width / item.height
            return (
              <li key={item.id} style={{ flexGrow: ratio, flexBasis: `calc(var(--row-h) * ${ratio})` }}>
                <GalleryTile item={item} onOpen={() => open(item.id)} />
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
        <DialogContent
          // While editing, the form is the only row and scrolls inside the dialog on short screens
          className={cn("max-h-dvh sm:max-w-[95vw] lg:max-w-6xl", editing && "max-h-[calc(100dvh-2rem)] grid-rows-[minmax(0,1fr)] sm:max-w-xl lg:max-w-xl")}
          onKeyDown={onPreviewKeyDown}
        >
          {openItem && managers && editing ? (
            <GalleryItemForm key={openItem.id} item={openItem} managers={managers} onDone={() => setEditing(false)} />
          ) : openItem && (
            <GalleryPreview
              item={openItem}
              actions={managers && (
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Edit details" onClick={() => setEditing(true)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost" size="icon-sm" aria-label="Delete" disabled={deleting}
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(openItem.id)}
                  >
                    {deleting ? <Spinner /> : <Trash2 />}
                  </Button>
                </div>
              )}
            >
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

      {managers && (
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[minmax(0,1fr)] sm:max-w-xl">
            {adding && <GalleryItemForm managers={managers} onDone={() => setAdding(false)} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
