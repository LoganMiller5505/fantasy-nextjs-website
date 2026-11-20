'use client'

import { startTransition, useActionState, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { PowerRankingWeek } from "@/lib/power-rankings"
import { saveWriteups } from "./actions"

const MAX_TEXT = 2000

// Every team in one week, in rank order, with a box for each author. Weeks written as one shared
// line per team (week 3) get a single box instead.
export function WriteupForm({ week }: { week: PowerRankingWeek }) {
  const [state, save, pending] = useActionState(saveWriteups, {})
  const [dirty, setDirty] = useState(false)
  const shared = week.rankings.some((r) => r.description)
  const authors = shared
    ? ([["Both", "Write-up", "description"]] as const)
    : ([["Logan", "Logan's", "loganDescription"], ["Andy", "Andy's", "andyDescription"]] as const)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await save(formData)
      setDirty(false)
    })
  }

  return (
    <form onSubmit={onSubmit} onChange={() => setDirty(true)} className="flex flex-col gap-4">
      <input type="hidden" name="year" value={week.year} />
      <input type="hidden" name="week" value={week.week} />

      {week.rankings.map((team) => (
        <section key={team.name} className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={team.logoPath} alt="" />
              <AvatarFallback>{team.name[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-base font-semibold">
              <span className="text-muted-foreground tabular-nums">#{team.newRank}</span> {team.name}
            </h2>
            <Badge variant="outline" className="tabular-nums">{team.record}</Badge>
            {team.oldRank != null && <span className="text-sm text-muted-foreground">Last week #{team.oldRank}</span>}
          </div>
          <div className={shared ? "" : "grid gap-3 sm:grid-cols-2"}>
            {authors.map(([author, label, field]) => (
              <label key={author} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Textarea
                  name={`${author}|${team.name}`}
                  defaultValue={team[field] ?? ""}
                  maxLength={MAX_TEXT}
                  className="min-h-24"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
          {state.error ? <span className="text-destructive">{state.error}</span>
            : dirty ? "Unsaved changes"
            : state.savedAt ? "Saved"
            : "Empty boxes aren't shown on the site."}
        </p>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          Save week {week.week}
        </Button>
      </div>
    </form>
  )
}
