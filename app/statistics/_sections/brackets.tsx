"use client"

import * as React from "react"
import { Trophy } from "lucide-react"
import { cn } from "cn"
import type { BracketSlot, brackets } from "../_lib/more-stats"
import { ScopeToggle } from "../_components/scope"
import { Panel, fmt } from "../_components/ui"

type Bracket = ReturnType<typeof brackets>[number]

function Matchup({ slots, caption, highlighted }: { slots: BracketSlot[]; caption?: string; highlighted: string | null }) {
  return (
    <div className="bg-card grid rounded-lg border text-sm">
      {caption && <div className="text-muted-foreground border-b px-3 py-1 text-xs">{caption}</div>}
      {slots.map((s, i) => (
        <div
          key={s.manager}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 tabular-nums",
            i === 0 && "border-b",
            !s.won && "text-muted-foreground",
            s.manager === highlighted && "bg-[color-mix(in_oklab,var(--highlight)_14%,var(--card))] shadow-[inset_3px_0_0_var(--highlight)]"
          )}
        >
          <span className="text-muted-foreground w-4 text-right text-xs">{s.seed}</span>
          <span className={cn("flex-1", s.won && "font-semibold")}>{s.manager}</span>
          <span className={cn(s.won && "font-semibold")}>{fmt(s.pf)}</span>
        </div>
      ))}
    </div>
  )
}

export function Brackets({ seasons, inProgress, highlighted }: { seasons: Bracket[]; inProgress: number | null; highlighted: string | null }) {
  const years = seasons.map((s) => s.year).sort((a, b) => b - a)
  const [year, setYear] = React.useState(years[0])
  const bracket = seasons.find((s) => s.year === year)!

  return (
    // minmax(0, 1fr) lets the bracket scroll sideways instead of widening the page
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Panel
        title={`${year} championship bracket`}
        controls={<ScopeToggle value={year} options={years} onChange={setYear} size="sm" />}
        description={`Every round of the championship bracket, with seeds.${inProgress ? ` The ${inProgress} bracket appears once that season's final is played.` : ""}`}
        method="Seeds come from the regular season: division winners first, then everyone else, each by record then points for (2024 had no divisions). Consolation games aren't shown; double-week rounds count both weeks' points."
        action={
          bracket.champion && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Trophy className="size-4" aria-hidden />
              {bracket.champion}
            </span>
          )
        }
      >
        <div className="flex gap-4 overflow-x-auto pb-1">
          {bracket.rounds.map((round, i) => (
            <div key={round.label} className="grid min-w-52 flex-1 content-around gap-3">
              <div className="text-muted-foreground text-xs font-medium">
                {round.label}
                {round.double && " (double week)"}
              </div>
              {round.byes.length > 0 && (
                <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-1.5 text-xs">
                  Bye: {round.byes.map((b) => `${b.manager} (${b.seed})`).join(", ")}
                </div>
              )}
              {round.games.map((slots) => (
                <Matchup key={slots[0].manager} slots={slots} highlighted={highlighted} />
              ))}
              {i === bracket.rounds.length - 1 && bracket.third && <Matchup slots={bracket.third} caption="3rd place" highlighted={highlighted} />}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
