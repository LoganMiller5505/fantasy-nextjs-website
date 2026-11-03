// Where each lineup's points come from: by slot, by player and by kind of stat

import type { Espn } from "@/lib/espn"
import { GROUPS, inScope, mean, pts, type RosterBase } from "./base"
import { groupBy, round, sum, type Scope } from "../stats"

// Starters' points per week from each kind of slot
export function positionScoring(base: RosterBase, scope: Scope) {
  const rows = [...groupBy(base.weeks.filter(inScope(scope)), (w) => w.manager)]
    .map(([manager, mine]) => ({
      manager,
      values: GROUPS.map((g) => round(mean(mine.map((w) => w.byGroup[g])), 1)),
    }))
    .sort((a, b) => a.manager.localeCompare(b.manager))
  const average = GROUPS.map((_, i) => round(mean(rows.map((r) => r.values[i])), 1))
  return { columns: [...GROUPS], rows, average }
}

export type Mvp = { name: string; position: string; points: number; starts: number }

// Each manager's top three players by points scored in their lineup
export function teamMvps(base: RosterBase, scope: Scope) {
  return [...groupBy(base.starts.filter(inScope(scope)), (s) => s.manager)]
    .map(([manager, mine]) => {
      const total = sum(mine.map(pts))
      const players: Mvp[] = [...groupBy(mine, (s) => s.player_id)]
        .map(([id, spots]) => ({ name: base.name(id), position: base.position(id), points: round(sum(spots.map(pts)), 1), starts: spots.length }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 3)
      return { manager, total: round(total, 1), share: total ? players[0].points / total : 0, players }
    })
    .sort((a, b) => b.share - a.share)
}

export const CATEGORIES = ["Yards", "Receptions", "Touchdowns", "Turnovers", "Kicking", "Defense", "Other"] as const

// Starters' points per week from each kind of stat, and touchdowns' share of the total. Kickers and
// defenses count whole; turnovers are negative.
export function statCategories(espn: Espn, base: RosterBase, scope: Scope) {
  const closed = new Set(base.starts.map((s) => `${s.year}|${s.period}`))
  const weeks = new Map([...groupBy(base.weeks.filter(inScope(scope)), (w) => w.manager)].map(([m, mine]) => [m, mine.length]))
  const rows = [...groupBy(espn.categories.filter(inScope(scope)).filter((c) => closed.has(`${c.year}|${c.period}`)), (c) => c.manager)]
    .filter(([manager]) => weeks.has(manager))
    .map(([manager, mine]) => {
      const total = (c: string) => sum(mine.filter((x) => x.category === c).map((x) => x.points))
      const all = sum(mine.map((x) => x.points)) || 1
      return {
        manager,
        values: CATEGORIES.map((c) => round(total(c) / weeks.get(manager)!, 1)),
        tdShare: round((100 * total("Touchdowns")) / all, 1),
      }
    })
    .sort((a, b) => a.manager.localeCompare(b.manager))
  const average = CATEGORIES.map((_, i) => round(mean(rows.map((r) => r.values[i])), 1))
  return { columns: [...CATEGORIES], rows, average, tdAverage: round(mean(rows.map((r) => r.tdShare)), 1) }
}

export type PlayerGame = { year: number; week: string; manager: string; name: string; position: string; points: number; projected: number | null }

// The best single weeks by a player in someone's lineup
export function playerGames(base: RosterBase, scope: Scope, n = 10, spots = base.starts): PlayerGame[] {
  return spots
    .filter(inScope(scope))
    .sort((a, b) => pts(b) - pts(a))
    .slice(0, n)
    .map((s) => ({
      year: s.year,
      week: base.week(s.year, s.period),
      manager: s.manager,
      name: base.name(s.player_id),
      position: base.position(s.player_id),
      points: pts(s),
      projected: s.projected,
    }))
}
