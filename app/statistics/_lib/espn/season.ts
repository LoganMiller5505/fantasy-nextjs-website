// One season at a time: each week's ESPN honours, and for the season under way, ESPN's view of
// this week and of the weeks left

import type { Espn, RosterSpot } from "@/lib/espn"
import { optimal, type RosterBase } from "./base"
import { groupBy, round, standings, sum, type Side } from "../stats"

export type Honours = {
  week: string
  player: { manager: string; name: string; position: string; points: number } | null
  bench: { manager: string; benched: string; started: string; gain: number } | null
  upset: { winner: string; loser: string; gap: number } | null
  dud: { manager: string; name: string; points: number; projected: number } | null
}

// For each regular-season week: the best starter, the costliest bench call, the biggest win over
// ESPN's projections, and the starter furthest below his projection
export function weeklyHonours(base: RosterBase, year: number): Honours[] {
  return [...groupBy(base.weeks.filter((w) => w.year === year), (w) => w.week_no)].map(([, ws]) => {
    const best = <T,>(xs: T[], score: (x: T) => number) => (xs.length ? xs.reduce((a, b) => (score(b) > score(a) ? b : a)) : null)
    const top = best(ws.filter((w) => w.top), (w) => w.top!.points)
    const bench = best(ws.filter((w) => w.blunder), (w) => w.blunder!.gain)
    const upset = best(
      ws.filter((w) => w.side?.win && w.oppProjected != null && w.projected < w.oppProjected),
      (w) => w.oppProjected! - w.projected
    )
    const dud = best(ws.filter((w) => w.dud), (w) => w.dud!.projected - w.dud!.points)
    return {
      week: ws[0].short,
      player: top && { manager: top.manager, ...top.top! },
      bench: bench && { manager: bench.manager, benched: bench.blunder!.benched.name, started: bench.blunder!.started.name, gain: bench.blunder!.gain },
      upset: upset && { winner: upset.manager, loser: upset.side!.opponent, gap: round(upset.oppProjected! - upset.projected, 1) },
      dud: dud && { manager: dud.manager, ...dud.dud! },
    }
  })
}

// The season under way: its first week ESPN hasn't closed, or null once every week is
function openWeek(espn: Espn, year: number) {
  return espn.periods.filter((p) => p.year === year && !p.is_final).sort((a, b) => a.week_no - b.week_no)[0] ?? null
}

// Each team's latest roster ESPN has, and which NFL week it's from
function latestRosters(espn: Espn, year: number) {
  const mine = espn.roster.filter((s) => s.year === year)
  const period = Math.max(...mine.map((s) => s.period))
  return { period, spots: groupBy(mine.filter((s) => s.period === period), (s) => s.manager) }
}

// Games in an NFL regular season, which ESPN's season-long projections cover
const GAMES = 17

const slotCounts = (espn: Espn, year: number) => new Map(espn.slots.filter((r) => r.year === year && r.starter).map((r) => [r.slot, r.count]))

export type ProjectedGame = {
  home: string
  away: string
  homeProj: number
  awayProj: number
  homePts: number | null // live, once games have started
  awayPts: number | null
}

// This week's games as ESPN projects them from the lineups set
export function thisWeek(espn: Espn, base: RosterBase, year: number) {
  const week = openWeek(espn, year)
  if (!week) return null
  const { period, spots } = latestRosters(espn, year)
  // Lineups for the week are in once ESPN has rosters for its first NFL week
  const current = week.scoring_periods.includes(period)
  const projected = (m: string) => round(sum((spots.get(m) ?? []).filter((s) => s.starter).map((s) => s.projected ?? 0)), 1)
  const live = (x: number | null) => (x ? x : null)
  const games: ProjectedGame[] = espn.matchups
    .filter((g) => g.year === year && g.week_no === week.week_no && g.away)
    .map((g) => ({
      home: g.home,
      away: g.away!,
      homeProj: projected(g.home),
      awayProj: projected(g.away!),
      homePts: live(g.home_points),
      awayPts: live(g.away_points),
    }))
  return { week: `W${week.week_no}`, playoff: week.is_playoff, current, games, lineupsFrom: base.week(year, period) }
}

export type RestOfSeasonRow = { manager: string; projected: number; actual: number; change: number; projectedRank: number; standing: number }

// Each current roster's best lineup by ESPN's season-long projections, per game, against what it
// has scored so far and where it stands. The sync stores these as `rest_of_season`, but they cover
// a whole season: about 17 weeks of each player's weekly projection.
export function restOfSeason(espn: Espn, base: RosterBase, sides: Side[], year: number): RestOfSeasonRow[] | null {
  const ros = new Map(espn.restOfSeason.filter((r) => r.year === year).map((r) => [r.player_id, r.points]))
  const week = openWeek(espn, year)
  if (!week || !ros.size) return null
  const { spots } = latestRosters(espn, year)
  const counts = slotCounts(espn, year)
  const table = standings(sides.filter((s) => s.year === year)).map((r) => r.manager)
  const actual = groupBy(base.weeks.filter((w) => w.year === year), (w) => w.manager)
  const rows = [...spots].map(([manager, roster]) => {
    const value = (s: RosterSpot) => (ros.get(s.player_id) ?? 0) / GAMES
    const projected = round(sum(optimal(roster, counts, base.position, value).map(value)), 1)
    const mine = actual.get(manager) ?? []
    const so = round(sum(mine.map((w) => w.started)) / (mine.length || 1), 1)
    return { manager, projected, actual: so, change: round(projected - so, 1), projectedRank: 0, standing: table.indexOf(manager) + 1 }
  })
  rows.sort((a, b) => b.projected - a.projected).forEach((r, i) => (r.projectedRank = i + 1))
  return rows
}

// For each regular-season NFL week still to come, which of each team's current starters are on bye
export function byeCrunch(espn: Espn, base: RosterBase, year: number) {
  const week = openWeek(espn, year)
  if (!week) return null
  const { period, spots } = latestRosters(espn, year)
  const ahead = espn.periods
    .filter((p) => p.year === year && !p.is_playoff)
    .flatMap((p) => p.scoring_periods)
    .filter((sp) => sp > period)
    .sort((a, b) => a - b)
  if (!ahead.length) return null
  const bye = new Map(espn.byes.filter((b) => b.year === year).map((b) => [b.pro_team, b.week]))
  const rows = [...spots]
    .map(([manager, roster]) => ({
      manager,
      out: ahead.map((sp) =>
        roster.filter((s) => s.starter && bye.get(espn.players[s.player_id]?.pro_team ?? "") === sp).map((s) => base.name(s.player_id))
      ),
    }))
    .sort((a, b) => a.manager.localeCompare(b.manager))
  return { weeks: ahead.map((sp) => base.week(year, sp)), rows }
}

// ESPN's projected finish for each team now, for the season under way
export function inSeasonProjection(espn: Espn, year: number) {
  const teams = espn.teams.filter((t) => t.year === year && t.current_rank != null)
  return teams.length ? teams.map((t) => ({ manager: t.manager, rank: t.current_rank! })) : null
}
