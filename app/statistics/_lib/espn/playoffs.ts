// Lineups in the championship bracket: who sets them best when it counts, and the games that won it

import { mean, pts, type RosterBase } from "./base"
import { groupBy, round, sum, type SeasonResult } from "../stats"

export type PlayoffLineupRow = {
  player: string
  Games: number
  "W-L": string
  Efficiency: number
  "Left/wk": number
  "+/- proj/wk": number
}

// Bracket games only: consolation games are left out
function bracketKeys(results: SeasonResult[]) {
  return new Set(results.flatMap((r) => r.bracketGames.map((g) => `${r.year}|${g}`)))
}

export function playoffLineups(base: RosterBase, results: SeasonResult[]): PlayoffLineupRow[] {
  const bracket = bracketKeys(results)
  const weeks = base.playoffWeeks.filter((w) => bracket.has(`${w.year}|${w.week_no}|${w.manager}`))
  return [...groupBy(weeks, (w) => w.manager)]
    .map(([player, mine]) => {
      const won = mine.filter((w) => w.side?.win).length
      return {
        player,
        Games: mine.length,
        "W-L": `${won}-${mine.length - won}`,
        Efficiency: round(sum(mine.map((w) => w.started)) / (sum(mine.map((w) => w.optimal)) || 1), 6),
        "Left/wk": round(mean(mine.map((w) => w.optimal - w.started)), 1),
        "+/- proj/wk": round(mean(mine.map((w) => w.started - w.projected)), 1),
      }
    })
    .sort((a, b) => b.Efficiency - a.Efficiency)
}

export type PlayoffHero = { year: number; round: string; manager: string; name: string; position: string; points: number; won: boolean }

// The best single games by a starter in the bracket
export function playoffHeroes(base: RosterBase, results: SeasonResult[], n = 10): PlayoffHero[] {
  const bracket = bracketKeys(results)
  const week = new Map(base.playoffWeeks.map((w) => [`${w.year}|${w.week_no}|${w.manager}`, w]))
  return base.allStarts
    .flatMap((s) => {
      const key = `${s.year}|${base.weekNo(s.year, s.period)}|${s.manager}`
      const w = week.get(key)
      return bracket.has(key) && w ? [{ s, w }] : []
    })
    .sort((a, b) => pts(b.s) - pts(a.s))
    .slice(0, n)
    .map(({ s, w }) => ({
      year: s.year,
      round: w.side?.label ?? w.short,
      manager: s.manager,
      name: base.name(s.player_id),
      position: base.position(s.player_id),
      points: pts(s),
      won: !!w.side?.win,
    }))
}
