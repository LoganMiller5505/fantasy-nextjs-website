// Head-to-head, player by player: the opposing players who did the most damage

import { pts, type RosterBase } from "./base"
import { groupBy, round, type Side } from "../stats"

export type FoePlayer = { name: string; position: string; points: number; games: number }

// For each manager, the opposing starters who scored the most against them, and for each pair,
// each side's best players against the other. Every game, playoffs included.
export function playerNemeses(base: RosterBase, sides: Side[], n = 3) {
  const starters = groupBy(base.allStarts, (s) => `${s.year}|${base.weekNo(s.year, s.period)}|${s.manager}`)
  type Tally = Map<number, { points: number; games: Set<string> }>
  const against = new Map<string, Tally>() // manager -> opposing player -> tally
  const pairs = new Map<string, Tally>() // "manager|opponent" -> the opponent's players against them
  const add = (map: Map<string, Tally>, key: string, id: number, points: number, game: string) => {
    if (!map.has(key)) map.set(key, new Map())
    const tally = map.get(key)!
    const t = tally.get(id) ?? { points: 0, games: new Set<string>() }
    t.points += points
    t.games.add(game)
    tally.set(id, t)
  }
  for (const s of sides) {
    const game = `${s.year}|${s.week_no}`
    for (const sp of starters.get(`${s.year}|${s.week_no}|${s.opponent}`) ?? []) {
      add(against, s.manager, sp.player_id, pts(sp), game)
      add(pairs, `${s.manager}|${s.opponent}`, sp.player_id, pts(sp), game)
    }
  }
  const top = (tally: Tally): FoePlayer[] =>
    [...tally]
      .map(([id, t]) => ({ name: base.name(id), position: base.position(id), points: round(t.points, 1), games: t.games.size }))
      .sort((a, b) => b.points - a.points)
      .slice(0, n)
  return {
    everyone: [...against].map(([manager, tally]) => ({ manager, players: top(tally) })).sort((a, b) => a.manager.localeCompare(b.manager)),
    // Keyed "manager|opponent": the opponent's players who did best against the manager
    pairs: Object.fromEntries([...pairs].map(([key, tally]) => [key, top(tally)])),
  }
}
