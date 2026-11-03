// One manager's ESPN story: each season's team, lineups and moves, their best players, and the
// best and worst of their drafts, adds and trades

import type { Espn } from "@/lib/espn"
import { pts, type RosterBase } from "./base"
import { draftHabits, skillPicks, type DraftPickRow } from "./draft"
import { moveRows, tradeExtremes, tradeLedger, type MoveRow, type TradeSideRow } from "./moves"
import { groupBy, round, standings, sum, type Side } from "../stats"

export type ManagerSeason = {
  year: number
  team: string
  efficiency: number | null
  vsProjection: number | null // points a week above or below projection
  deadStarts: number
  projected: number | null // ESPN's draft-day projected finish
  finish: number | null
  final: boolean // finish is the final place, not the standings so far
  adds: number
  trades: number
}

export type ManagerEspn = {
  seasons: ManagerSeason[]
  mvps: { name: string; position: string; points: number; starts: number; seasons: string }[]
  bestPicks: DraftPickRow[]
  worstPicks: DraftPickRow[]
  habits: { columns: string[]; values: (number | null)[]; average: number[] } | null
  bestMoves: MoveRow[]
  worstMoves: MoveRow[]
  trades: TradeSideRow[]
}

export function managerEspn(espn: Espn, base: RosterBase, sides: Side[]): Record<string, ManagerEspn> {
  const managers = [...new Set(espn.teams.map((t) => t.manager))]
  const picks = skillPicks(espn, base, "all")
  const habits = draftHabits(espn, base, "all")
  const moves = moveRows(espn, base, "all")
  const ledger = tradeLedger(espn, base, "all")
  const ends = tradeExtremes(ledger, Infinity)
  const tradeSides = [...ends.best, ...ends.worst]
  const tables = new Map(
    [...new Set(espn.teams.map((t) => t.year))].map((y) => [y, standings(sides.filter((s) => s.year === y)).map((r) => r.manager)])
  )
  const n = 3

  return Object.fromEntries(
    managers.map((manager) => {
      const seasons = espn.teams
        .filter((t) => t.manager === manager)
        .sort((a, b) => b.year - a.year)
        .map((t) => {
          const weeks = base.weeks.filter((w) => w.year === t.year && w.manager === manager)
          const optimal = sum(weeks.map((w) => w.optimal))
          const standing = (tables.get(t.year)?.indexOf(manager) ?? -1) + 1
          return {
            year: t.year,
            team: t.name,
            efficiency: optimal ? round(sum(weeks.map((w) => w.started)) / optimal, 6) : null,
            vsProjection: weeks.length ? round(sum(weeks.map((w) => w.started - w.projected)) / weeks.length, 1) : null,
            deadStarts: sum(weeks.map((w) => w.dead.length)),
            projected: t.draft_rank,
            finish: t.final_rank ?? (standing || null),
            final: t.final_rank != null,
            adds: t.acquisitions,
            trades: t.trades,
          }
        })
      const mvps = [...groupBy(base.starts.filter((s) => s.manager === manager), (s) => s.player_id)]
        .map(([id, spots]) => ({
          name: base.name(id),
          position: base.position(id),
          points: round(sum(spots.map(pts)), 1),
          starts: spots.length,
          seasons: [...new Set(spots.map((s) => s.year))].sort().join(", "),
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5)
      const mine = picks.filter((p) => p.manager === manager).sort((a, b) => b.value - a.value)
      const row = habits.rows.find((r) => r.manager === manager)
      const myMoves = moves.filter((m) => m.manager === manager)
      return [
        manager,
        {
          seasons,
          mvps,
          bestPicks: mine.slice(0, n),
          worstPicks: mine.slice(-n).reverse(),
          habits: row ? { columns: habits.columns, values: row.values, average: habits.average } : null,
          bestMoves: myMoves.slice(0, n),
          worstMoves: myMoves.slice(-n).reverse(),
          trades: tradeSides.filter((t) => t.manager === manager).sort((a, b) => b.year - a.year || b.margin - a.margin),
        },
      ]
    })
  )
}
