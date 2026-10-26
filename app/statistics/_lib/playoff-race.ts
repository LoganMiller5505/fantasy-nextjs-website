// Playoff odds for a season in progress: the rest of the regular season is played out many times,
// with each manager's weekly score drawn from a normal distribution. Division winners (best record,
// then points for) take the top seeds, ordered by record then points for; everyone else is seeded
// by record, then points for. The random generator has a fixed seed, so every build shows the
// same numbers.

import type { League } from "@/lib/league"
import { latestYear, managersIn, record, round, sum, type SeasonResult, type Side } from "./stats"

const RUNS = 10_000
// Weeks of league-average scoring each manager starts with, before their own scores take over
const PRIOR_WEEKS = 6

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

  // Plays out the regular season from what's known after `played`: each manager's weekly score is
  // drawn around their average so far. The generator restarts from the same seed every time, so
  // the latest week's odds match the ones shown elsewhere on the page.
  type Game = { manager: string; opponent: string }
  const simulate = (played: Side[], remaining: Game[]) => {
    const wins = new Map(managers.map((m) => [m, played.filter((s) => s.manager === m && s.win).length]))
    const pf = new Map(managers.map((m) => [m, sum(played.filter((s) => s.manager === m).map((s) => s.pf))]))

    // A handful of weeks says little about a manager, so their scores lean on the league's: their
    // own count for n/(n + PRIOR_WEEKS) of the mix, half and half after six weeks. On top of that,
    // each run draws how good every manager really is, with that doubt shrinking as weeks are
    // played. Without it, one big opening week would read as a sure thing for the whole season.
    const scores = (m: string) => played.filter((s) => s.manager === m && !s.double).map((s) => s.pf)
    const all = played.filter((s) => !s.double).map((s) => s.pf)
    const model = new Map(
      managers.map((m) => {
        const own = scores(m)
        const weight = own.length / (own.length + PRIOR_WEEKS)
        return [
          m,
          {
            mean: own.length ? weight * mean(own) + (1 - weight) * mean(all) : mean(all),
            sd: Math.sqrt((own.length ? weight * sd(own) ** 2 : 0) + (1 - weight) * sd(all) ** 2),
            doubt: sd(all) / Math.sqrt(own.length + PRIOR_WEEKS),
          },
        ]
      })
    )

    const z = normal(random(year))
    const seedCounts = new Map(managers.map((m) => [m, new Array<number>(managers.length).fill(0)]))
    const winTotals = new Map(managers.map((m) => [m, 0]))
    const divisionTitles = new Map(managers.map((m) => [m, 0]))
    for (let run = 0; run < RUNS; run++) {
      const w = new Map(wins)
      const p = new Map(pf)
      const level = new Map(managers.map((m) => [m, model.get(m)!.mean + model.get(m)!.doubt * z()]))
      for (const g of remaining) {
        const a = level.get(g.manager)! + model.get(g.manager)!.sd * z()
        const b = level.get(g.opponent)! + model.get(g.opponent)!.sd * z()
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
    const playoffOdds = (m: string) => round((sum(seedCounts.get(m)!.slice(0, spots)) / RUNS) * 100, 1)
    const divisionOdds = (m: string) => round((divisionTitles.get(m)! / RUNS) * 100, 1)
    return { seedCounts, winTotals, playoffOdds, divisionOdds }
  }

  const season = sides.filter((s) => s.year === year && !s.playoff)
  const wins = new Map(managers.map((m) => [m, season.filter((s) => s.manager === m && s.win).length]))
  const losses = new Map(managers.map((m) => [m, season.filter((s) => s.manager === m && !s.win).length]))
  const pf = new Map(managers.map((m) => [m, sum(season.filter((s) => s.manager === m).map((s) => s.pf))]))
  const { seedCounts, winTotals, divisionOdds } = simulate(season, remaining)

  // The same odds as they stood after each week played so far: everything after that week is
  // treated as unplayed, and the model only knows the scores up to then
  const schedule = league.games.filter((g) => g.year === year && regularWeeks.has(g.week_no) && g.manager < g.opponent)
  const playedWeeks = [...new Set(season.map((s) => s.week_no))].sort((a, b) => a - b)
  const history = playedWeeks.map((week) => {
    const then = simulate(
      season.filter((s) => s.week_no <= week),
      schedule.filter((g) => g.week_no > week)
    )
    const label = `After ${season.find((s) => s.week_no === week)!.short}`
    return {
      playoffs: { week: label, ...Object.fromEntries(managers.map((m) => [m, then.playoffOdds(m)])) },
      division: { week: label, ...Object.fromEntries(managers.map((m) => [m, then.divisionOdds(m)])) },
    }
  })

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
        divisionTitle: divisionOdds(m),
        seeds: seeds.slice(0, spots),
        missed: round(sum(seeds.slice(spots)), 1),
        status: status(m),
      }
    })
    .sort((a, b) => b.playoffs - a.playoffs || b.projectedWins - a.projectedWins)

  const weeksLeft = new Set(remaining.map((g) => g.week_no)).size
  return {
    year,
    spots,
    divisionSeeds: divisions.length,
    runs: RUNS,
    weeksLeft,
    rows,
    // One point per week played: { week: "After W3", Logan: 64.2, ... }
    playoffsByWeek: history.map((h) => h.playoffs),
    divisionByWeek: history.map((h) => h.division),
    divisions: divisions.map((d) => ({ division: d, managers: managers.filter((m) => division.get(m) === d) })),
  }
}
