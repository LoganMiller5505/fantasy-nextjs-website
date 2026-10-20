// Playoff odds for a season in progress: the rest of the regular season is played out many times,
// with each manager's weekly score drawn from a normal distribution. Division winners (best record,
// then points for) take the top seeds, ordered by record then points for; everyone else is seeded
// by record, then points for. The random generator has a fixed seed, so every build shows the
// same numbers.

import type { League } from "@/lib/league"
import { latestYear, managersIn, record, round, sum, type SeasonResult, type Side } from "./stats"

const RUNS = 10_000

// mulberry32: a small seeded PRNG, uniform on [0, 1)
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box–Muller
function normal(rand: () => number) {
  return () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
}

const mean = (xs: number[]) => sum(xs) / xs.length
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)))

export function playoffRace(league: League, sides: Side[], results: SeasonResult[]) {
  const year = latestYear(league)
  if (!results.find((r) => r.year === year)?.inProgress) return null
  const regularWeeks = new Set(league.weeks.filter((w) => w.year === year && !w.is_playoff).map((w) => w.week_no))
  const remaining = league.games.filter(
    (g) => g.year === year && g.points == null && regularWeeks.has(g.week_no) && g.manager < g.opponent
  )
  if (!remaining.length) return null

  const managers = managersIn(league, year)
  // Playoff spots: the bracket size of the latest finished season with the same number of teams
  const spots =
    results
      .filter((r) => !r.inProgress && league.teams.filter((t) => t.year === r.year).length === managers.length)
      .sort((a, b) => b.year - a.year)[0]?.playoffTeams.length ?? Math.floor(managers.length / 2)

  const division = new Map(league.teams.filter((t) => t.year === year).map((t) => [t.manager, t.division]))
  const divisions = [...new Set([...division.values()].filter((d) => d != null))]

  // Division winners first, then the rest, each by wins then points for: the rule in stats.ts
  // playoffSeeds, on running totals so it stays cheap across thousands of runs
  const seedOrder = (w: Map<string, number>, p: Map<string, number>) => {
    const byRecord = (a: string, b: string) => w.get(b)! - w.get(a)! || p.get(b)! - p.get(a)!
    const ranked = managers.slice().sort(byRecord)
    const winners = divisions.map((d) => ranked.find((m) => division.get(m) === d)!).sort(byRecord)
    return [...winners, ...ranked.filter((m) => !winners.includes(m))]
  }

  const season = sides.filter((s) => s.year === year && !s.playoff)
  const wins = new Map(managers.map((m) => [m, season.filter((s) => s.manager === m && s.win).length]))
  const losses = new Map(managers.map((m) => [m, season.filter((s) => s.manager === m && !s.win).length]))
  const pf = new Map(managers.map((m) => [m, sum(season.filter((s) => s.manager === m).map((s) => s.pf))]))

  // A handful of weeks says little about a manager, so each one's mean and SD are pulled halfway
  // toward the league's
  const scores = (m: string) => season.filter((s) => s.manager === m && !s.double).map((s) => s.pf)
  const all = season.filter((s) => !s.double).map((s) => s.pf)
  const model = new Map(
    managers.map((m) => [
      m,
      { mean: (mean(scores(m)) + mean(all)) / 2, sd: Math.sqrt((sd(scores(m)) ** 2 + sd(all) ** 2) / 2) },
    ])
  )

  const z = normal(random(year))
  const seedCounts = new Map(managers.map((m) => [m, new Array<number>(managers.length).fill(0)]))
  const winTotals = new Map(managers.map((m) => [m, 0]))
  const divisionTitles = new Map(managers.map((m) => [m, 0]))
  for (let run = 0; run < RUNS; run++) {
    const w = new Map(wins)
    const p = new Map(pf)
    for (const g of remaining) {
      const a = model.get(g.manager)!.mean + model.get(g.manager)!.sd * z()
      const b = model.get(g.opponent)!.mean + model.get(g.opponent)!.sd * z()
      p.set(g.manager, p.get(g.manager)! + a)
      p.set(g.opponent, p.get(g.opponent)! + b)
      const winner = a > b ? g.manager : g.opponent
      w.set(winner, w.get(winner)! + 1)
    }
    seedOrder(w, p).forEach((m, i) => {
      seedCounts.get(m)![i]++
      if (i < divisions.length) divisionTitles.set(m, divisionTitles.get(m)! + 1)
    })
    for (const m of managers) winTotals.set(m, winTotals.get(m)! + w.get(m)!)
  }

  // Clinched and eliminated ignore the points tiebreak, so a tie on wins always counts as a threat,
  // and they assume the worst about who wins the other divisions. Neither badge can turn out wrong;
  // they just appear later than a full tiebreak check would show them.
  const left = new Map(managers.map((m) => [m, remaining.filter((g) => g.manager === m || g.opponent === m).length]))
  const best = (m: string) => wins.get(m)! + left.get(m)!
  const status = (m: string) => {
    const others = managers.filter((o) => o !== m)
    const rivals = others.filter((o) => division.get(o) === division.get(m))
    const winsDivision = division.get(m) != null && rivals.every((o) => best(o) < wins.get(m)!)
    const canWinDivision = division.get(m) != null && rivals.every((o) => wins.get(o)! <= best(m))
    // At worst, everyone who can still match m's record finishes ahead, and so does a weaker
    // winner of every other division
    const threats = others.filter((o) => best(o) >= wins.get(m)!).length
    const otherWinners = divisions.filter((d) => d !== division.get(m)).length
    if (winsDivision || threats + otherWinners < spots) return "clinched" as const
    // Teams already out of reach of m's best record are seeded ahead of m whenever m doesn't win
    // its division
    if (!canWinDivision && others.filter((o) => wins.get(o)! > best(m)).length >= spots) return "eliminated" as const
    return null
  }

  const rows = managers
    .map((m) => {
      const seeds = seedCounts.get(m)!.map((n) => round((n / RUNS) * 100, 1))
      return {
        manager: m,
        record: record(wins.get(m)!, losses.get(m)!),
        pf: round(pf.get(m)!, 1),
        projectedWins: round(winTotals.get(m)! / RUNS, 1),
        playoffs: round(sum(seeds.slice(0, spots)), 1),
        topSeed: seeds[0],
        division: division.get(m) ?? null,
        divisionTitle: round((divisionTitles.get(m)! / RUNS) * 100, 1),
        seeds: seeds.slice(0, spots),
        missed: round(sum(seeds.slice(spots)), 1),
        status: status(m),
      }
    })
    .sort((a, b) => b.playoffs - a.playoffs || b.projectedWins - a.projectedWins)

  const weeksLeft = new Set(remaining.map((g) => g.week_no)).size
  return { year, spots, divisionSeeds: divisions.length, runs: RUNS, weeksLeft, rows }
}
