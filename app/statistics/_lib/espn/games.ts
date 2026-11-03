// Stats from the NFL games behind each lineup: when the points came, the games turned on the last
// day of the week, QB stacks, and each manager's favourite NFL team. Regular-season weeks ESPN has
// closed, like the other lineup stats.

import { KICKOFF_SLOTS, type RosterSpot } from "@/lib/espn"
import { inScope, mean, pts, type RosterBase } from "./base"
import { groupBy, round, sum, type Scope } from "../stats"

// Each manager's share of their starters' points from each kickoff slot
export function kickoffSlots(base: RosterBase, scope: Scope) {
  const rows = [...groupBy(base.starts.filter(inScope(scope)), (s) => s.manager)]
    .map(([manager, mine]) => {
      const total = sum(mine.map(pts)) || 1
      return { manager, values: KICKOFF_SLOTS.map((slot) => round((100 * sum(mine.filter((s) => s.slot_time === slot).map(pts))) / total, 1)) }
    })
    .sort((a, b) => a.manager.localeCompare(b.manager))
  const average = KICKOFF_SLOTS.map((_, i) => round(mean(rows.map((r) => r.values[i])), 1))
  return { columns: [...KICKOFF_SLOTS], rows, average }
}

export type SwingRow = { player: string; Games: number; Comebacks: number; Collapses: number; Net: number }
export type Comeback = { year: number; short: string; winner: string; loser: string; deficit: number; pf: number; pa: number }

// Games turned on the week's last game day (usually Monday night): a comeback is a win by a team
// that trailed going into it, a collapse a loss by one that led
export function finalDaySwings(base: RosterBase, scope: Scope, n = 10) {
  // The last game day of each NFL week, from every rostered player's game
  const lastDay = new Map<string, string>()
  for (const s of base.rostered) {
    const key = `${s.year}|${s.period}`
    if (s.kick_date && s.kick_date > (lastDay.get(key) ?? "")) lastDay.set(key, s.kick_date)
  }
  // Each lineup's points before that day
  const before = new Map<string, number>()
  for (const s of base.starts.filter(inScope(scope))) {
    if (s.kick_date && s.kick_date >= lastDay.get(`${s.year}|${s.period}`)!) continue
    const key = `${s.year}|${base.weekNo(s.year, s.period)}|${s.manager}`
    before.set(key, (before.get(key) ?? 0) + pts(s))
  }
  const games = base.weeks.filter(inScope(scope)).flatMap((w) => {
    if (!w.side) return []
    const lead = (before.get(`${w.year}|${w.week_no}|${w.manager}`) ?? 0) - (before.get(`${w.year}|${w.week_no}|${w.side.opponent}`) ?? 0)
    return [{ w, side: w.side, lead }]
  })
  const rows: SwingRow[] = [...groupBy(games, (g) => g.w.manager)]
    .map(([player, mine]) => {
      const comebacks = mine.filter((g) => g.lead < 0 && g.side.win).length
      const collapses = mine.filter((g) => g.lead > 0 && !g.side.win).length
      return { player, Games: mine.length, Comebacks: comebacks, Collapses: collapses, Net: comebacks - collapses }
    })
    .sort((a, b) => b.Net - a.Net || b.Comebacks - a.Comebacks)
  // Each collapse is the other side's comeback, so one list covers both
  const biggest: Comeback[] = games
    .filter((g) => g.lead < 0 && g.side.win)
    .sort((a, b) => a.lead - b.lead)
    .slice(0, n)
    .map(({ w, side, lead }) => ({ year: w.year, short: w.short, winner: w.manager, loser: side.opponent, deficit: round(-lead, 1), pf: side.pf, pa: side.pa }))
  return { rows, biggest }
}

export type StackRow = { player: string; Weeks: number; Stacked: number; "Stack pts": number; "Pts stacked": number; "Pts otherwise": number }
export type Stack = { year: number; week: string; manager: string; team: string; qb: string; catchers: string[]; points: number }

// A stack: a QB started with a WR or TE from the same NFL team that week
export function stacks(base: RosterBase, scope: Scope, n = 10) {
  const weeks = [...groupBy(base.starts.filter(inScope(scope)), (s) => `${s.year}|${s.period}|${s.manager}`).values()].map((spots) => {
    const found: Stack[] = spots
      .filter((s) => base.position(s.player_id) === "QB" && s.pro_team)
      .flatMap((qb) => {
        const catchers = spots.filter((s) => s !== qb && s.pro_team === qb.pro_team && ["WR", "TE"].includes(base.position(s.player_id)))
        if (!catchers.length) return []
        return [
          {
            year: qb.year,
            week: base.week(qb.year, qb.period),
            manager: qb.manager,
            team: qb.pro_team!,
            qb: base.name(qb.player_id),
            catchers: catchers.map((c) => base.name(c.player_id)),
            points: round(pts(qb) + sum(catchers.map(pts)), 1),
          },
        ]
      })
    return { manager: spots[0].manager, total: sum(spots.map(pts)), found }
  })
  const rows: StackRow[] = [...groupBy(weeks, (w) => w.manager)]
    .map(([player, mine]) => {
      const stacked = mine.filter((w) => w.found.length)
      const other = mine.filter((w) => !w.found.length)
      return {
        player,
        Weeks: mine.length,
        Stacked: stacked.length,
        "Stack pts": round(mean(stacked.map((w) => sum(w.found.map((f) => f.points)))), 1),
        "Pts stacked": round(mean(stacked.map((w) => w.total)), 1),
        "Pts otherwise": round(mean(other.map((w) => w.total)), 1),
      }
    })
    .sort((a, b) => b.Stacked - a.Stacked)
  const best = weeks
    .flatMap((w) => w.found)
    .sort((a, b) => b.points - a.points)
    .slice(0, n)
  return { rows, best }
}

export type FandomRow = { manager: string; team: string; share: number; points: number; starts: number; runnerUp: string | null; teams: number }

// Each manager's most-started NFL team, by points from its players in their lineup
export function fandom(base: RosterBase, scope: Scope): FandomRow[] {
  return [...groupBy(base.starts.filter(inScope(scope)).filter((s) => s.pro_team), (s) => s.manager)]
    .map(([manager, mine]) => {
      const total = sum(mine.map(pts)) || 1
      const teams = [...groupBy(mine, (s) => s.pro_team!)]
        .map(([team, spots]: [string, RosterSpot[]]) => ({ team, points: sum(spots.map(pts)), starts: spots.length }))
        .sort((a, b) => b.points - a.points)
      return {
        manager,
        team: teams[0].team,
        share: round((100 * teams[0].points) / total, 1),
        points: round(teams[0].points, 1),
        starts: teams[0].starts,
        runnerUp: teams[1]?.team ?? null,
        teams: teams.length,
      }
    })
    .sort((a, b) => b.share - a.share)
}
