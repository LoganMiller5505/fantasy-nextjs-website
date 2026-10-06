'use client'

import Link from "next/link"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRankings, type Author, type PowerRankingWeek } from "@/lib/power-rankings"
import { PowerRank } from "./power_rank"

type Props = { weeks: PowerRankingWeek[] }

// Reads the selected week from ?week=N, falling back to the latest week
export function PowerRankingsFromUrl({ weeks }: Props) {
  const week = useSearchParams().get("week")
  return <PowerRankingsView weeks={weeks} week={week} />
}

export function PowerRankingsView({ weeks, week }: Props & { week?: string | null }) {
  const [author, setAuthor] = useState<Author>('andy')
  const found = weeks.findIndex((w) => String(w.week) === week)
  const index = found === -1 ? weeks.length - 1 : found
  const selected = weeks[index]
  const prev = weeks[index - 1]
  const next = weeks[index + 1]
  const hasAuthors = selected.rankings.some((r) => 'loganDescription' in r)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2>Power Rankings</h2>
            {hasAuthors && (
              <div role="group" aria-label="Description author" className="inline-flex items-center rounded-lg bg-muted p-[3px]">
                <AuthorButton active={author === 'andy'} label="Andy's descriptions" onClick={() => setAuthor('andy')}>A</AuthorButton>
                <AuthorButton active={author === 'logan'} label="Logan's descriptions" onClick={() => setAuthor('logan')}>L</AuthorButton>
              </div>
            )}
          </div>
          {hasAuthors && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Analysis by <span className="font-medium text-foreground">{author === 'logan' ? 'Logan' : 'Andy'}</span>.
              Switch to {author === 'logan' ? "Andy's" : "Logan's"} with the A/L toggle.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <WeekButton week={prev?.week} label="Previous week"><ChevronLeft /></WeekButton>
          <span className="w-16 text-center text-sm font-medium tabular-nums" aria-live="polite">
            Week {selected.week}
          </span>
          <WeekButton week={next?.week} label="Next week"><ChevronRight /></WeekButton>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {getRankings(weeks, selected.week).map((team) => <PowerRank key={team.name} {...team} author={author} />)}
      </div>
      <p className="text-sm text-muted-foreground">
        Power rankings are constructed by averaging Logan&apos;s rankings, Andy&apos;s rankings, and ESPN&apos;s rankings. Week 3 was the first week of power rankings.
      </p>
    </section>
  )
}

function WeekButton({ week, label, children }: { week?: number, label: string, children: React.ReactNode }) {
  if (week == null) {
    return <Button variant="outline" size="icon-sm" aria-label={label} disabled>{children}</Button>
  }
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      nativeButton={false}
      render={<Link href={`?week=${week}`} replace scroll={false} />}
    >
      {children}
    </Button>
  )
}

function AuthorButton({ active, label, onClick, children }: { active: boolean, label: string, onClick: () => void, children: React.ReactNode }) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      size="icon-sm"
      className={active ? "shadow-sm" : "text-muted-foreground"}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
