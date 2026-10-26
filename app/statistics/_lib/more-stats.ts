// More derivations for the statistics pages. Same rules as stats.ts: double weeks are left
// out of per-week stats and a bye is a missing row.

import type { League } from "@/lib/league"
import {
  groupBy,
  median,
  pct,
  playoffSeeds,
  record,
  round,
  standings,
  sum,
  type SeasonResult,
  type Side,
} from "./stats"

// Linear interpolation between the two nearest ranks
const quantile = (sorted: number[], q: number) => {
  const i = (sorted.length - 1) * q
  const lo = Math.floor(i)
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo)
}

// ---------------------------------------------------------------------------------------------
// Consistency: the spread of each manager's weekly scores

export type ConsistencyRow = {
  player: string
  GP: number
  Mean: number
  SD: number
  Floor: number // 10th percentile
  Median: number
  Ceiling: number // 90th percentile
  Low: number
  High: number
  "Above median": string // weeks above / below the league's median that week
  p25: number
  p75: number
}

export function consistency(sides: Side[], year: number | "all"): ConsistencyRow[] {
  const pool = sides.filter((s) => !s.double && (year === "all" || s.year === year))
  const weekMedian = new Map(
    [...groupBy(pool, (s) => `${s.year}|${s.week_no}`)].map(([key, week]) => [key, median(week.map((s) => s.pf))])
  )
  return [...groupBy(pool, (s) => s.manager)]
    .map(([player, mine]) => {
      const pfs = mine.map((s) => s.pf).sort((a, b) => a - b)
      const mean = sum(pfs) / pfs.length
      const above = mine.filter((s) => s.pf > weekMedian.get(`${s.year}|${s.week_no}`)!).length
      return {
        player,
        GP: pfs.length,
        Mean: round(mean, 1),
        SD: round(Math.sqrt(sum(pfs.map((x) => (x - mean) ** 2)) / pfs.length), 1),
        Floor: round(quantile(pfs, 0.1), 1),
        Median: round(quantile(pfs, 0.5), 1),
        Ceiling: round(quantile(pfs, 0.9), 1),
        Low: pfs[0],
        High: pfs[pfs.length - 1],
        "Above median": record(above, pfs.length - above),
        p25: round(quantile(pfs, 0.25), 1),
        p75: round(quantile(pfs, 0.75), 1),
      }
    })
    .sort((a, b) => a.SD - b.SD)
}

// ---------------------------------------------------------------------------------------------
// Weekly grid: every manager's score every week, ranked within the week

export type GridCell = { pf: number; opponent: string; win: boolean; rank: number | null } | null

export function weeklyGrid(sides: Side[], year: number) {
  const season = sides.filter((s) => s.year === year)
  const weeks = [...new Map(season.map((s) => [s.week_no, s])).values()]
    .sort((a, b) => a.week_no - b.week_no)
    .map((s) => ({ week_no: s.week_no, short: s.short, label: s.label, double: s.double }))
  const managers = standings(season).map((r) => r.manager)
  const rankIn = new Map<string, number>()
  for (const [, week] of groupBy(season.filter((s) => !s.double), (s) => s.week_no)) {
    ;[...week].sort((a, b) => b.pf - a.pf).forEach((s, i) => rankIn.set(`${s.week_no}|${s.manager}`, i + 1))
  }
  return {
    year,
    weeks,
    rows: managers.map((manager) => ({
      manager,
      cells: weeks.map((w): GridCell => {
        const s = season.find((s) => s.week_no === w.week_no && s.manager === manager)
        return s ? { pf: s.pf, opponent: s.opponent, win: s.win, rank: rankIn.get(`${s.week_no}|${manager}`) ?? null } : null
      }),
    })),
  }
}

// ---------------------------------------------------------------------------------------------
// Schedule swap: A's regular-season record against B's opponents. In a week where B played A, A
// plays B instead. The diagonal is each manager's real record.

export function scheduleSwap(sides: Side[], year: number) {
  const season = sides.filter((s) => s.year === year && !s.playoff)
  const managers = standings(season).map((r) => r.manager)
  const score = new Map(season.map((s) => [`${s.week_no}|${s.manager}`, s.pf]))
  const actual = new Map(managers.map((m) => [m, season.filter((s) => s.manager === m && s.win).length]))
  const rows = managers.map((a) => ({
    manager: a,
    cells: managers.map((b) => {
      let w = 0
      let l = 0
      for (const g of season.filter((s) => s.manager === b)) {
        const mine = score.get(`${g.week_no}|${a}`)
        if (mine == null) continue // a bye for A that week
        const opp = g.opponent === a ? b : g.opponent
        if (mine > score.get(`${g.week_no}|${opp}`)!) w++
        else l++
      }
      return { schedule: b, wins: w, losses: l, change: w - actual.get(a)! }
    }),
  }))
  return { year, managers, rows }
}

// ---------------------------------------------------------------------------------------------
// Head-to-head grid: every pair's all-time record, playoffs included

export function h2hGrid(sides: Side[]) {
  const managers = [...new Set(sides.map((s) => s.manager))].sort()
  const pairs = groupBy(sides, (s) => `${s.manager}|${s.opponent}`)
  return {
    managers,
    rows: managers.map((a) => ({
      manager: a,
      cells: managers.map((b) => {
        const games = pairs.get(`${a}|${b}`) ?? []
        const w = games.filter((s) => s.win).length
        return { opponent: b, wins: w, losses: games.length - w, pct: games.length ? pct(w, games.length - w) : null }
      }),
    })),
  }
}

// ---------------------------------------------------------------------------------------------
// Playoff brackets, from the championship bracket seasonResults found

export type BracketSlot = { manager: string; seed: number; pf: number; won: boolean }

export function brackets(league: League, sides: Side[], results: SeasonResult[]) {
  return results
    .filter((r) => !r.inProgress)
    .map((r) => {
      const season = sides.filter((s) => s.year === r.year)
      const division = new Map(league.teams.filter((t) => t.year === r.year).map((t) => [t.manager, t.division]))
      const seed = new Map(playoffSeeds(standings(season), (m) => division.get(m) ?? null).map((m, i) => [m, i + 1]))
      const inBracket = new Set(r.bracketGames)
      const playoffWeeks = league.weeks.filter((w) => w.year === r.year && w.is_playoff).sort((a, b) => a.week_no - b.week_no)
      const slot = (s: Side): BracketSlot => ({ manager: s.manager, seed: seed.get(s.manager)!, pf: s.pf, won: s.win })
      const matchup = (s: Side) => {
        const other = season.find((o) => o.week_no === s.week_no && o.manager === s.opponent)!
        return [slot(s), slot(other)].sort((a, b) => a.seed - b.seed)
      }
      const alive = new Set(r.playoffTeams)
      const rounds = playoffWeeks.map((w) => {
        const games = season.filter((s) => s.week_no === w.week_no && inBracket.has(`${w.week_no}|${s.manager}`))
        const byes = [...alive].filter((m) => !games.some((s) => s.manager === m)).sort((a, b) => seed.get(a)! - seed.get(b)!)
        for (const s of games) if (!s.win) alive.delete(s.manager)
        return {
          label: w.label,
          double: w.is_double_week,
          byes: byes.map((m) => ({ manager: m, seed: seed.get(m)! })),
          games: games
            .filter((s) => seed.get(s.manager)! < seed.get(s.opponent)!)
            .sort((a, b) => seed.get(a.manager)! - seed.get(b.manager)!)
            .map(matchup),
        }
      })
      const thirdGame = season.find(
        (s) => s.week_no === playoffWeeks.at(-1)!.week_no && s.manager === r.third && s.win
      )
      return { year: r.year, champion: r.champion, rounds, third: thirdGame ? matchup(thirdGame) : null }
    })
}
