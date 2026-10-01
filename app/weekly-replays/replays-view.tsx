'use client'

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ReplayVideo, ReplayWeek } from "@/lib/weekly-replays"

type Props = { weeks: ReplayWeek[] }

// Reads the selected week from ?week=N, falling back to the latest week
export function ReplaysFromUrl({ weeks }: Props) {
  const week = useSearchParams().get("week")
  return <ReplaysView weeks={weeks} week={week} />
}

export function ReplaysView({ weeks, week }: Props & { week?: string | null }) {
  const router = useRouter()
  const selected = weeks.find((w) => w.week === week) ?? weeks.at(-1)!
  const items = weeks.map((w) => ({ label: `Week ${w.week}`, value: w.week }))

  const reel = selected.videos.find((v) => v.isReel)
  const matchups = selected.videos.filter((v) => !v.isReel)

  return (
    <div className="flex flex-col gap-6">
      <Select
        items={items}
        value={selected.week}
        onValueChange={(v) => v && router.replace(`?week=${v}`, { scroll: false })}
      >
        <SelectTrigger className="w-full max-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Weeks</SelectLabel>
            {items.toReversed().map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {reel && <ReplayPlayer video={reel} />}

      {matchups.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {matchups.map((v) => <ReplayPlayer key={v.src} video={v} />)}
        </div>
      )}
    </div>
  )
}

function ReplayPlayer({ video }: { video: ReplayVideo }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className={video.isReel ? "text-lg font-semibold" : "text-sm font-medium"}>{video.title}</h2>
      <video
        key={video.src}
        src={video.src}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full rounded-md bg-black"
      />
    </div>
  )
}
