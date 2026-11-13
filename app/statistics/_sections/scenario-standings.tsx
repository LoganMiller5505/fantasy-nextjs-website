"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Race } from "../_lib/playoff-race"
import { ordinal, record } from "../_lib/stats"
import { Segmented } from "../_components/scope"
import { Panel, SimpleTable } from "../_components/ui"
import { Chip } from "./season-story"

type Row = Race["standings"][number]
type View = "Overall" | "By division"

const list = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`)

// Picks that give some managers more games than others: who has how many, most games first.
// Null when everyone has the same.
function unevenPicks(rows: Row[]) {
  const byCount = new Map<number, string[]>()
  for (const r of rows) byCount.set(r.won + r.lost, [...(byCount.get(r.won + r.lost) ?? []), r.manager])
  if (byCount.size < 2) return null
  const groups = [...byCount].sort(([a], [b]) => b - a)
  const games = (n: number) => `${n} game${n === 1 ? "" : "s"}`
  const has = (names: string[]) => (names.length === 1 ? "has" : "have")
  // Two groups and the bigger one last reads as "…, everyone else 11"
  if (groups.length === 2 && groups[1][1].length > groups[0][1].length) {
    const [[n, names], [rest]] = groups
    return `${list(names)} ${has(names)} ${games(n)} counted, everyone else ${rest}.`
  }
  return `${groups.map(([n, names]) => `${list(names)} ${has(names)} ${games(n)}`).join("; ")} counted.`
}

// With a what-if in: the table as it would stand with the picked results in and the other games
// still to play, laid out like a long shot's example standings, plus each manager's weeks
export function ScenarioStandings({
  standings,
  spots,
  divisionSeeds,
  highlighted,
}: {
  standings: Row[]
  spots: number
  divisionSeeds: number
  highlighted: string | null
}) {
  const [view, setView] = React.useState<View>("Overall")
  const uneven = unevenPicks(standings)
  const seed = new Map(standings.map((t, i) => [t.manager, i]))
  // By division: each division's managers in seed order, so its winner leads, divisions in the
  // order their winners are seeded
  const byDivision = divisionSeeds > 0 && view === "By division"
  const divisions = [...new Set(standings.map((t) => t.division).filter((d) => d != null))]
  const groups = byDivision ? divisions.map((d) => ({ label: d, rows: standings.filter((t) => t.division === d) })) : null
  const rows = groups ? groups.flatMap((g) => g.rows) : standings
  const starts = groups?.map((g, i) => ({ label: g.label, before: groups.slice(0, i).reduce((n, o) => n + o.rows.length, 0) }))
  const showDivision = divisionSeeds > 0 && !byDivision
  const winner = (t: Row) => seed.get(t.manager)! < divisionSeeds
  const winnerBadge = (
    <Badge variant="secondary" className="h-4 px-1 text-[0.65rem]">
      Div. winner
    </Badge>
  )
  return (
    <Panel
      title="Standings with these results"
      description="Where everyone would stand with the picked results in, before any other game is played."
      method={`Seeded as the playoffs are${divisionSeeds ? ": division winners first, then everyone else, each" : ""} by record, then points for. A picked result adds a win or a loss but no points, so PF is only the games played, and the order between managers level on wins can still change.${divisionSeeds ? " By division keeps each manager's overall seed." : ""} In the weeks, an outlined result is picked and a dotted square is a game still open.`}
      controls={
        divisionSeeds > 0 && <Segmented label="Standings view" size="sm" value={view} options={["Overall", "By division"] as const} onChange={setView} />
      }
    >
      <div className="grid gap-2">
        <SimpleTable
          head={["Seed", "Manager", "Record", ...(showDivision ? ["Division"] : []), "Weeks"]}
          align={["left", "left", "right", ...(showDivision ? (["left"] as const) : []), "left"]}
          highlight={(i) => rows[i].manager === highlighted}
          divider={!byDivision && spots < rows.length ? { before: spots, label: "Playoff line" } : undefined}
          groups={starts}
          rows={rows.map((t) => [
            seed.get(t.manager)! < spots ? (
              <span key="seed" className="inline-flex items-center gap-1.5">
                {ordinal(seed.get(t.manager)! + 1)}
                {byDivision && winner(t) && winnerBadge}
              </span>
            ) : (
              <span key="out" className="text-muted-foreground">
                Out
              </span>
            ),
            t.manager,
            <span key="record" className="inline-flex items-center justify-end gap-1.5">
              {t.tied && (
                <Badge variant="outline" className="h-4 px-1 text-[0.65rem]">
                  tied
                </Badge>
              )}
              {record(t.won, t.lost)}
            </span>,
            ...(showDivision
              ? [
                  <span key="division" className="inline-flex items-center gap-1.5">
                    {t.division}
                    {winner(t) && winnerBadge}
                  </span>,
                ]
              : []),
            <div key="weeks" className="flex gap-0.5">
              {t.weeks.map((w) => (
                <Chip key={w.week} result={w.result} label={w.week} picked={w.picked} />
              ))}
            </div>,
          ])}
        />
        {standings.some((t) => t.tied) && (
          <p className="text-muted-foreground text-xs">Tied: level on wins, so points for decides. It&apos;s shown in the order points for so far gives.</p>
        )}
        {uneven && (
          <div role="note" className="flex gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
            <div>
              <span className="font-medium">Uneven picks:</span> {uneven}
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
