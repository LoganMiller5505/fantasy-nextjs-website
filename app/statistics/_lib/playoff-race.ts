// Playoff odds for a season in progress: the rest of the regular season is played out many times,
// with each manager's weekly score drawn from a normal distribution. Division winners (best record,
// then points for) take the top seeds, ordered by record then points for; everyone else is seeded
// by record, then points for. The random generator has a fixed seed, so every build shows the
// same numbers. Any odds that come out at exactly 0% or 100% are then checked against every way the
// rest of the season can go (certainty.ts), and only stand if that check agrees.

import type { League } from "@/lib/league"
import { reachable, seedMask } from "./certainty"
import { pathsTo, type Destiny, type Outcome } from "./paths"
import { latestYear, managersIn, ordinal, record, round, sum, type SeasonResult, type Side } from "./stats"

const RUNS = 100_000
// Search nodes to spend looking for a nicer example season (outright, or winning or losing out)
const EXAMPLE_BUDGET = 300_000
// Outright searches per calculation: most long shots late in a season can only happen with a tie,
// and proving there's no outright way costs the whole budget each time
const OUTRIGHT_TRIES = 8
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

// Everything the odds are worked out from: the season in progress, its playoff format, the seeding
// rule and the simulation. Null once the regular season is over.
function raceModel(league: League, results: SeasonResult[]) {
  const year = latestYear(league)
  if (!results.find((r) => r.year === year)?.inProgress) return null
  const regularWeeks = new Set(league.weeks.filter((w) => w.year === year && !w.is_playoff).map((w) => w.week_no))
  const remaining = league.games.filter(
    (g) => g.year === year && g.points == null && regularWeeks.has(g.week_no) && g.manager < g.opponent
  )
  if (!remaining.length) return null

  const managers = managersIn(league, year)
  // Playoff spots: the bracket size of the latest finished season with the same number of teams
  const reference = results
    .filter((r) => !r.inProgress && league.teams.filter((t) => t.year === r.year).length === managers.length)
    .sort((a, b) => b.year - a.year)[0]
  const spots = reference?.playoffTeams.length ?? Math.floor(managers.length / 2)
  // First-round byes in that bracket: playoff teams without a game in the first playoff week
  const firstRound = Math.min(...league.weeks.filter((w) => w.year === reference?.year && w.is_playoff).map((w) => w.week_no))
  const byes = reference ? reference.playoffTeams.filter((m) => !reference.bracketGames.includes(`${firstRound}|${m}`)).length : 0

  const division = new Map(league.teams.filter((t) => t.year === year).map((t) => [t.manager, t.division]))
  const divisions = [...new Set([...division.values()].filter((d) => d != null))]
  const setup = { managers, division, divisions }
  // Final seeds as bit masks (seed s is bit s - 1): every seed, a playoff spot, a division title
  const ALL = seedMask(1, managers.length)
  const IN = seedMask(1, spots)
  const TITLE = seedMask(1, divisions.length)

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
  type Game = { manager: string; opponent: string; week_no: number }
  // `keep`: also keep every run's seeds and results, for the paths to each outcome
  const simulate = (played: Side[], remaining: Game[], keep = false) => {
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
    // Next week's games: how often each manager wins or loses theirs, and how often they make the
    // playoffs after each, for the odds with a win and with a loss
    const nextWeek = Math.min(...remaining.map((g) => g.week_no))
    const after = new Map(managers.map((m) => [m, { won: 0, wonIn: 0, lost: 0, lostIn: 0 }]))
    const runs = keep
      ? { count: RUNS, seed: new Uint8Array(RUNS * managers.length), homeWon: new Uint8Array(RUNS * remaining.length) }
      : null
    const place = new Map(managers.map((m, i) => [m, i]))
    for (let run = 0; run < RUNS; run++) {
      const nextWinners: string[] = []
      const nextLosers: string[] = []
      const w = new Map(wins)
      const p = new Map(pf)
      const level = new Map(managers.map((m) => [m, model.get(m)!.mean + model.get(m)!.doubt * z()]))
      for (const [i, g] of remaining.entries()) {
        const a = level.get(g.manager)! + model.get(g.manager)!.sd * z()
        const b = level.get(g.opponent)! + model.get(g.opponent)!.sd * z()
        p.set(g.manager, p.get(g.manager)! + a)
        p.set(g.opponent, p.get(g.opponent)! + b)
        const winner = a > b ? g.manager : g.opponent
        w.set(winner, w.get(winner)! + 1)
        if (runs && a > b) runs.homeWon[run * remaining.length + i] = 1
        if (g.week_no === nextWeek) {
          nextWinners.push(winner)
          nextLosers.push(winner === g.manager ? g.opponent : g.manager)
        }
      }
      const order = seedOrder(w, p)
      order.forEach((m, i) => {
        seedCounts.get(m)![i]++
        if (runs) runs.seed[run * managers.length + place.get(m)!] = i
        if (i < divisions.length) divisionTitles.set(m, divisionTitles.get(m)! + 1)
      })
      const made = new Set(order.slice(0, spots))
      for (const m of nextWinners) {
        after.get(m)!.won++
        if (made.has(m)) after.get(m)!.wonIn++
      }
      for (const m of nextLosers) {
        after.get(m)!.lost++
        if (made.has(m)) after.get(m)!.lostIn++
      }
      for (const m of managers) winTotals.set(m, winTotals.get(m)! + w.get(m)!)
    }

    // Percentages for manager m, each from `hits` runs out of `total` landing in the seeds `event`.
    // A figure the runs put at 0% or 100% is only shown that way if no way of finishing the season
    // proves it wrong; otherwise it's shown just inside the range, as "<1%" or ">99%". The same goes
    // for anything that would only round to 0 or 100.
    // Exhaustive answers so far, by manager, target and condition: whether some season lands m in
    // the target, an example season when one was found, and `sure`: false when the search ran out of
    // budget before settling it (it then counts as possible, to be safe)
    const checked = new Map<string, { possible: boolean; witness: string[] | null; sure: boolean }>()
    // `example`: only after an example season, so a small search budget will do
    const check = (m: string, targets: number[], fixed: { week: number; win: boolean }[] = [], outright = false, example = false) => {
      const id = (t: number) => `${m}|${t}|${fixed.map((f) => `${f.week}${f.win}`).join()}|${outright}|${example}`
      const open = [...new Set(targets.filter((t) => !checked.has(id(t))))]
      if (open.length) {
        const witnesses: (string[] | null)[] = []
        const report = { aborted: false }
        const possible = reachable(setup, wins, pf, remaining, m, open, {
          fixed,
          witnesses,
          outright,
          budget: example ? EXAMPLE_BUDGET : undefined,
          report,
        })
        open.forEach((t, i) => {
          const witness = witnesses[i] ?? null
          checked.set(id(t), { possible: possible[i], witness, sure: witness != null || !report.aborted })
        })
      }
      return targets.map((t) => checked.get(id(t))!)
    }
    const odds = (m: string, claims: { hits: number; total: number; event: number }[], fixed?: { week: number; win: boolean }[]) => {
      const targets: number[] = []
      const asked = claims.map((c) =>
        c.hits === 0 ? targets.push(c.event) - 1 : c.hits === c.total ? targets.push(ALL & ~c.event) - 1 : -1
      )
      const answers = targets.length ? check(m, targets, fixed) : []
      return claims.map((c, i) => {
        if (asked[i] < 0) return Math.min(99.9, Math.max(0.1, round((c.hits / c.total) * 100, 1)))
        if (c.hits === 0) return answers[asked[i]].possible ? 0.1 : 0
        return answers[asked[i]].possible ? 99.9 : 100
      })
    }
    // The odds of m landing in `seeds` from `hits` runs, with an example season when no run did.
    // Outright first (nobody else on m's number of wins, so points for doesn't come into it); failing
    // that, with a tie: m winning out, then losing out, then whatever the search found first.
    let outrightTries = 0
    const ownWeeks = (m: string) => remaining.filter((g) => g.manager === m || g.opponent === m).map((g) => g.week_no)
    const verify = (m: string, seeds: number, hits: number) => {
      const result = odds(m, [{ hits, total: RUNS, event: seeds }])[0]
      if (hits > 0 || result === 0) return { odds: result, witness: null }
      const tries = [
        { fixed: [], outright: true },
        { fixed: ownWeeks(m).map((week) => ({ week, win: true })), outright: false },
        { fixed: ownWeeks(m).map((week) => ({ week, win: false })), outright: false },
      ]
      for (const { fixed, outright } of tries) {
        if (outright && outrightTries++ >= OUTRIGHT_TRIES) continue
        const { witness } = check(m, [seeds], fixed, outright, true)[0]
        if (witness) return { odds: result, witness }
      }
      // The search behind the odds always has one, unless it ran out of budget
      return { odds: result, witness: check(m, [seeds])[0].witness }
    }
    const inPlayoffs = (m: string) => sum(seedCounts.get(m)!.slice(0, spots))
    // Playoff and division-title odds
    const headline = (m: string) => {
      const [playoffs, division] = odds(m, [
        { hits: inPlayoffs(m), total: RUNS, event: IN },
        { hits: divisionTitles.get(m)!, total: RUNS, event: TITLE },
      ])
      return { playoffs, division }
    }
    // Those, plus each playoff seed and the odds after a win and after a loss next week
    const detail = (m: string) => {
      const counts = seedCounts.get(m)!.slice(0, spots)
      const [playoffs, division, ...seeds] = odds(m, [
        { hits: inPlayoffs(m), total: RUNS, event: IN },
        { hits: divisionTitles.get(m)!, total: RUNS, event: TITLE },
        ...counts.map((hits, i) => ({ hits, total: RUNS, event: seedMask(i + 1, i + 1) })),
      ])
      // Null for a manager without a game next week (or, in the odd case, never on one side of it)
      const a = after.get(m)!
      const next =
        a.won && a.lost
          ? {
              win: odds(m, [{ hits: a.wonIn, total: a.won, event: IN }], [{ week: nextWeek, win: true }])[0],
              loss: odds(m, [{ hits: a.lostIn, total: a.lost, event: IN }], [{ week: nextWeek, win: false }])[0],
            }
          : null
      return { playoffs, division, seeds, next }
    }
    // Whether winning out settles m landing in `seeds`: if it can't land there at all, winning out
    // overshoots; if it can't miss, m controls it; otherwise m needs help. Null if the search can't
    // settle it within the example budget: it's a label, not worth seconds of search.
    const destiny = (m: string, seeds: number): Destiny | null => {
      const winOut = ownWeeks(m).map((week) => ({ week, win: true }))
      const reach = check(m, [seeds], winOut, false, true)[0]
      if (!reach.sure) return null
      if (!reach.possible) return "overshoots"
      const miss = check(m, [ALL & ~seeds], winOut, false, true)[0]
      if (!miss.sure) return null
      return miss.possible ? "needs-help" : "controls"
    }
    return { winTotals, headline, detail, runs, verify, destiny, wins, pf }
  }

  return { year, regularWeeks, remaining, managers, spots, byes, division, divisions, ALL, IN, TITLE, seedOrder, simulate }
}

// The weeks of the season in progress played so far, for the odds as they stood after each one
export function playedWeeks(league: League, sides: Side[]) {
  const year = latestYear(league)
  return [...new Set(sides.filter((s) => s.year === year && !s.playoff).map((s) => s.week_no))].sort((a, b) => a - b)
}

// The playoff and division odds as they stood after `week`: everything after it is treated as
// unplayed, and the model only knows the scores up to then (Outlook's trend charts). One point
// per chart: { week: "After W3", Logan: 64.2, ... }
export function oddsAfterWeek(league: League, sides: Side[], results: SeasonResult[], week: number) {
  const model = raceModel(league, results)
  if (!model) return null
  const { year, regularWeeks, managers, simulate } = model
  const season = sides.filter((s) => s.year === year && !s.playoff)
  const schedule = league.games.filter((g) => g.year === year && regularWeeks.has(g.week_no) && g.manager < g.opponent)
  const then = simulate(
    season.filter((s) => s.week_no <= week),
    schedule.filter((g) => g.week_no > week)
  )
  const label = `After ${season.find((s) => s.week_no === week)!.short}`
  const odds = new Map(managers.map((m) => [m, then.headline(m)]))
  return {
    playoffs: { week: label, ...Object.fromEntries(managers.map((m) => [m, odds.get(m)!.playoffs])) },
    division: { week: label, ...Object.fromEntries(managers.map((m) => [m, odds.get(m)!.division])) },
  }
}

// What Outlook shows: the odds now plus the odds as they stood after each week played, which the
// data layer (data.ts) caches separately and puts together
export type RaceTrend = NonNullable<ReturnType<typeof oddsAfterWeek>>
export type Race = NonNullable<ReturnType<typeof playoffRace>> & {
  playoffsByWeek: RaceTrend["playoffs"][]
  divisionByWeek: RaceTrend["division"][]
}

// The odds now: each manager's playoff, seed and division chances, clinched and eliminated, and
// the paths to every outcome
export function playoffRace(league: League, sides: Side[], results: SeasonResult[]) {
  const model = raceModel(league, results)
  if (!model) return null
  const { year, remaining, managers, spots, byes, division, divisions, ALL, IN, TITLE, seedOrder, simulate } = model
  const season = sides.filter((s) => s.year === year && !s.playoff)
  const wins = new Map(managers.map((m) => [m, season.filter((s) => s.manager === m && s.win).length]))
  const losses = new Map(managers.map((m) => [m, season.filter((s) => s.manager === m && !s.win).length]))
  const pf = new Map(managers.map((m) => [m, sum(season.filter((s) => s.manager === m).map((s) => s.pf))]))
  const now = simulate(season, remaining, true)
  const { winTotals, detail } = now

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
      const odds = detail(m)
      // A badge is a proof, and so is an odds figure that survived the exhaustive check
      const proven = status(m) ?? (odds.playoffs === 100 ? "clinched" : odds.playoffs === 0 ? "eliminated" : null)
      const playoffs = proven === "clinched" ? 100 : proven === "eliminated" ? 0 : odds.playoffs
      const out = proven === "eliminated"
      return {
        manager: m,
        record: record(wins.get(m)!, losses.get(m)!),
        pf: round(pf.get(m)!, 1),
        projectedWins: round(winTotals.get(m)! / RUNS, 1),
        playoffs,
        topSeed: out ? 0 : odds.seeds[0],
        division: division.get(m) ?? null,
        divisionTitle: out ? 0 : odds.division,
        seeds: out ? odds.seeds.map(() => 0) : odds.seeds,
        missed: round(100 - playoffs, 1),
        // Playoff odds after winning and after losing next week's game
        next: odds.next && proven ? { win: playoffs, loss: playoffs } : odds.next,
        status: proven,
      }
    })
    .sort((a, b) => b.playoffs - a.playoffs || b.projectedWins - a.projectedWins)

  // Path to…: every outcome each manager can aim for, and the ways the runs reach it
  const statusOf = new Map(rows.map((r) => [r.manager, r.status]))
  const outcomes = (m: string): Outcome[] => [
    { key: "playoffs", label: "Make the playoffs", seeds: IN },
    ...(division.get(m) ? [{ key: "division", label: `Win the ${division.get(m)} division`, seeds: TITLE }] : []),
    ...(byes > 0 && byes < spots ? [{ key: "bye", label: "Get a first-round bye", seeds: seedMask(1, byes) }] : []),
    ...Array.from({ length: spots }, (_, i) => ({
      key: `seed-${i + 1}`,
      label: `Take the ${ordinal(i + 1)} seed`,
      seeds: seedMask(i + 1, i + 1),
    })),
    { key: "miss", label: "Miss the playoffs", seeds: ALL & ~IN },
  ]
  const paths = pathsTo({
    managers,
    games: remaining,
    runs: now.runs!,
    wins,
    losses,
    outcomes,
    pf,
    division,
    seedOrder,
    // A clinched or eliminated badge settles making and missing the playoffs, as in the table
    destiny: now.destiny,
    verify: (m, seeds, hits) => {
      const status = statusOf.get(m)
      if (status && (seeds === IN || seeds === (ALL & ~IN))) {
        const made = status === "clinched"
        return { odds: (seeds === IN) === made ? 100 : 0, witness: null }
      }
      return now.verify(m, seeds, hits)
    },
  })

  const weeksLeft = new Set(remaining.map((g) => g.week_no)).size
  return {
    year,
    spots,
    divisionSeeds: divisions.length,
    runs: RUNS,
    weeksLeft,
    rows,
    divisions: divisions.map((d) => ({ division: d, managers: managers.filter((m) => division.get(m) === d) })),
    paths,
  }
}
