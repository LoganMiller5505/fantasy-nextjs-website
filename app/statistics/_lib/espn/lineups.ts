// Lineup calls: how close each lineup came to the best one its roster allowed, and the worst calls

import { inScope, type Choice, type DeadStart, type RosterBase } from "./base"
import { groupBy, round, sum, type Scope } from "../stats"

export type LineupRow = {
  player: string
  Weeks: number
  Started: number
  Optimal: number
  Efficiency: number // started / optimal
  "Left/wk": number
  "Bench/wk": number
  Perfect: number // weeks with the best possible lineup
  "Lineup L": number // losses the best lineup would have won
}

export function lineupEfficiency(base: RosterBase, scope: Scope): LineupRow[] {
  return [...groupBy(base.weeks.filter(inScope(scope)), (w) => w.manager)]
    .map(([player, mine]) => {
      const started = sum(mine.map((w) => w.started))
      const best = sum(mine.map((w) => w.optimal))
      return {
        player,
        Weeks: mine.length,
        Started: round(started, 1),
        Optimal: round(best, 1),
        Efficiency: round(best ? started / best : 1, 6), // shown as a percentage, so kept precise enough to round once
        "Left/wk": round((best - started) / mine.length, 1),
        "Bench/wk": round(sum(mine.map((w) => w.bench)) / mine.length, 1),
        Perfect: mine.filter((w) => w.optimal - w.started < 0.01).length,
        "Lineup L": mine.filter((w) => w.side && !w.side.win && w.side.pf + w.optimal - w.started > w.side.pa).length,
      }
    })
    .sort((a, b) => b.Efficiency - a.Efficiency)
}

export type Blunder = {
  year: number
  short: string
  manager: string
  opponent: string | null
  benched: Choice
  started: Choice
  gain: number
  flipped: boolean // the swap alone would have turned a loss into a win
}

export function benchBlunders(base: RosterBase, scope: Scope, n = 10): Blunder[] {
  return base.weeks
    .filter(inScope(scope))
    .flatMap((w) =>
      w.blunder
        ? [
            {
              year: w.year,
              short: w.short,
              manager: w.manager,
              opponent: w.side?.opponent ?? null,
              ...w.blunder,
              flipped: !!w.side && !w.side.win && w.blunder.gain > w.side.pa - w.side.pf,
            },
          ]
        : []
    )
    .sort((a, b) => b.gain - a.gain)
    .slice(0, n)
}

export type DeadStartRow = { player: string; "Dead starts": number; Cost: number }
export type DeadStartLine = DeadStart & { year: number; short: string; manager: string; lost: boolean }

// Starters who were never going to score, and what the best bench player for the slot would have
// added in their place
export function deadStarts(base: RosterBase, scope: Scope, n = 10) {
  const weeks = base.weeks.filter(inScope(scope))
  const rows: DeadStartRow[] = [...groupBy(weeks, (w) => w.manager)]
    .map(([player, mine]) => {
      const dead = mine.flatMap((w) => w.dead)
      return { player, "Dead starts": dead.length, Cost: round(sum(dead.map((d) => d.cost)), 1) }
    })
    .sort((a, b) => b["Dead starts"] - a["Dead starts"] || b.Cost - a.Cost)
  const worst: DeadStartLine[] = weeks
    .flatMap((w) =>
      w.dead.map((d) => ({ ...d, year: w.year, short: w.short, manager: w.manager, lost: !!w.side && !w.side.win && d.cost > w.side.pa - w.side.pf }))
    )
    .sort((a, b) => b.cost - a.cost)
    .slice(0, n)
  return { rows, worst }
}

export type VsEspnRow = {
  player: string
  Weeks: number
  "You/wk": number
  "ESPN/wk": number
  "+/- per wk": number
  Better: number // weeks your lineup outscored the one ESPN's projections would have picked
  Worse: number
}

// The lineup each manager set against the one ESPN's projections would have set from the same
// roster, both scored on what the players actually did
export function vsEspnLineup(base: RosterBase, scope: Scope): VsEspnRow[] {
  return [...groupBy(base.weeks.filter(inScope(scope)), (w) => w.manager)]
    .map(([player, mine]) => ({
      player,
      Weeks: mine.length,
      "You/wk": round(sum(mine.map((w) => w.started)) / mine.length, 1),
      "ESPN/wk": round(sum(mine.map((w) => w.espnPick)) / mine.length, 1),
      "+/- per wk": round(sum(mine.map((w) => w.started - w.espnPick)) / mine.length, 1),
      Better: mine.filter((w) => w.started - w.espnPick > 0.01).length,
      Worse: mine.filter((w) => w.espnPick - w.started > 0.01).length,
    }))
    .sort((a, b) => b["+/- per wk"] - a["+/- per wk"])
}

export type OpponentLineupRow = {
  player: string
  Games: number
  "Vs you": number // opponents' lineup efficiency in games against you
  Usual: number // the same opponents' efficiency over the span, weighted by games
  Diff: number // percentage points; above zero, they set better lineups against you
}

// Did opponents set their best lineups against you? Their efficiency in your games against their
// efficiency in general.
export function opponentLineups(base: RosterBase, scope: Scope): OpponentLineupRow[] {
  const weeks = base.weeks.filter(inScope(scope))
  const byKey = new Map(weeks.map((w) => [`${w.year}|${w.week_no}|${w.manager}`, w]))
  const usual = new Map(
    [...groupBy(weeks, (w) => w.manager)].map(([m, mine]) => [m, sum(mine.map((w) => w.started)) / (sum(mine.map((w) => w.optimal)) || 1)])
  )
  return [...groupBy(weeks, (w) => w.manager)]
    .map(([player, mine]) => {
      const opps = mine.flatMap((w) => {
        const o = w.side && byKey.get(`${w.year}|${w.week_no}|${w.side.opponent}`)
        return o ? [o] : []
      })
      const vsYou = sum(opps.map((o) => o.started)) / (sum(opps.map((o) => o.optimal)) || 1)
      const theirs = opps.length ? sum(opps.map((o) => usual.get(o.manager)!)) / opps.length : 0
      return { player, Games: opps.length, "Vs you": round(vsYou, 6), Usual: round(theirs, 6), Diff: round(100 * (vsYou - theirs), 1) }
    })
    .filter((r) => r.Games > 0)
    .sort((a, b) => b.Diff - a.Diff)
}
