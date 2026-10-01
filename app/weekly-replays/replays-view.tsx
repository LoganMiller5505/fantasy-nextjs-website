'use client'

import { useState } from "react"
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
  const weekItems = weeks.map((w) => ({ label: `Week ${w.week}`, value: w.week }))

  // Matchup choice only applies to the week it was made in, so any week change resets to the reel
  // (videos are sorted reel first)
  const [picked, setPicked] = useState<{ week: string, src: string } | null>(null)
  const video = (picked?.week === selected.week && selected.videos.find((v) => v.src === picked.src))
    || selected.videos[0]
  const matchupItems = selected.videos.map((v) => ({ label: v.title, value: v.src }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Select
          items={weekItems}
          value={selected.week}
          onValueChange={(v) => v && router.replace(`?week=${v}`, { scroll: false })}
        >
          <SelectTrigger className="w-full max-w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Weeks</SelectLabel>
              {weekItems.toReversed().map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={matchupItems}
          value={video.src}
          onValueChange={(src) => src && setPicked({ week: selected.week, src })}
        >
          <SelectTrigger className="w-full max-w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Matchups</SelectLabel>
              {matchupItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <ReplayPlayer key={video.src} video={video} />
    </div>
  )
}

function ReplayPlayer({ video }: { video: ReplayVideo }) {
  return (
    <video
      src={video.src}
      title={video.title}
      controls
      playsInline
      preload="metadata"
      className="aspect-video w-full rounded-md bg-black"
    />
  )
}
