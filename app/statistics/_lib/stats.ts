// Every stat on the statistics pages, derived from the league tables. Double weeks are left out of
// per-week stats, totals include every game (playoffs and consolation games too, as the sheet
// does), and a bye is a missing row rather than a zero.

import type { Division, League, Ranker, Week } from "@/lib/league"

// One played game from one manager's side, with its week and both divisions attached.
export type Side = {
  year: number
  week_no: number
  label: string // the sheet's name for the week: "Week 5", "Opener", "Playoff Round 1"
  short: string // "W5" for regular weeks, "P1", "P2"... for playoff rounds
  manager: string
  opponent: string
  pf: number
  pa: number
  win: boolean
  playoff: boolean
  double: boolean
  division: Division | null
  oppDivision: Division | null
}

// Fewer games than this and an all-time row is greyed out and listed last: too few to compare
// with full careers
export const FEW_GAMES = 10

// A season, or every season
export type Scope = number | "all"
export const inScope = (scope: Scope) => (s: Side) => scope === "all" || s.year === scope

export const record = (w: number, l: number) => `${w}-${l}`
export const pct = (w: number, l: number) => (w + l ? w / (w + l) : 0)
export const round = (x: number, places = 2) => Math.round(x * 10 ** places) / 10 ** places
export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length / 2
  return s.length % 2 ? s[Math.floor(mid)] : (s[mid - 1] + s[mid]) / 2
}
export const groupBy = <T, K>(xs: T[], key: (x: T) => K) => {
  const map = new Map<K, T[]>()
  for (const x of xs) map.set(key(x), [...(map.get(key(x)) ?? []), x])
  return map
}
function shortLabels(weeks: Week[]) {
  const lastRegular = new Map<number, number>()
  for (const w of weeks) {
    if (!w.is_playoff) lastRegular.set(w.year, Math.max(lastRegular.get(w.year) ?? 0, w.week_no))
  }
  return new Map(
    weeks.map((w) => [
      `${w.year}|${w.week_no}`,
      w.is_playoff ? `P${w.week_no - lastRegular.get(w.year)!}` : `W${w.week_no}`,
    ])
  )
}

export const latestYear = (league: League) => Math.max(...league.teams.map((t) => t.year))
export const seasonsOf = (league: League) => [...new Set(league.teams.map((t) => t.year))].sort((a, b) => b - a)
export const managersIn = (league: League, year: number) =>
  league.teams.filter((t) => t.year === year).map((t) => t.manager).sort()

export function playedSides(league: League): Side[] {
  const week = new Map(league.weeks.map((w) => [`${w.year}|${w.week_no}`, w]))
  const division = new Map(league.teams.map((t) => [`${t.year}|${t.manager}`, t.division]))
  const game = new Map(league.games.map((g) => [`${g.year}|${g.week_no}|${g.manager}`, g]))
  const short = shortLabels(league.weeks)
  return league.games
    .filter((g) => g.points != null)
    .map((g) => {
      const w = week.get(`${g.year}|${g.week_no}`)!
      const pa = game.get(`${g.year}|${g.week_no}|${g.opponent}`)!.points!
      return {
        year: g.year,
        week_no: g.week_no,
        label: w.label,
        short: short.get(`${g.year}|${g.week_no}`)!,
        manager: g.manager,
        opponent: g.opponent,
        pf: g.points!,
        pa,
        win: g.points! > pa,
        playoff: w.is_playoff,
        double: w.is_double_week,
        division: division.get(`${g.year}|${g.manager}`) ?? null,
        oppDivision: division.get(`${g.year}|${g.opponent}`) ?? null,
      }
    })
    .sort((a, b) => a.year - b.year || a.week_no - b.week_no || a.manager.localeCompare(b.manager))
}

// Regular season, wins then points for.
export function standings(sides: Side[]) {
  return [...groupBy(sides.filter((s) => !s.playoff), (s) => s.manager)]
    .map(([manager, mine]) => {
      const wins = mine.filter((s) => s.win).length
      return { manager, wins, losses: mine.length - wins, pf: round(sum(mine.map((s) => s.pf))), pa: round(sum(mine.map((s) => s.pa))) }
    })
    .sort((a, b) => b.wins - a.wins || b.pf - a.pf)
}

// Playoff seeding: division winners (best record, then points for) take the top seeds, ordered by
// record then points for; everyone else follows by record, then points for. A season without
// divisions is seeded by record alone.
export function playoffSeeds(table: ReturnType<typeof standings>, division: (manager: string) => Division | null) {
  const winners = new Set<string>()
  const decided = new Set<Division>()
  for (const { manager } of table) {
    const d = division(manager)
    if (d && !decided.has(d)) {
      decided.add(d)
      winners.add(manager)
    }
  }
  return [...table.filter((r) => winners.has(r.manager)), ...table.filter((r) => !winners.has(r.manager))].map((r) => r.manager)
}

// ---------------------------------------------------------------------------------------------
// Champions. Every team plays every playoff week, consolation games included, and nothing in the
// data says which bracket a game is in. The championship bracket is found from the seeding: it's
// the smallest group of top regular-season seeds that only ever play each other, round by round,
// with each loser dropping out. Its final-week game is the title game; the two teams knocked out
// the round before meet for 3rd.

export type SeasonResult = {
  year: number
  inProgress: boolean
  champion: string | null
  runnerUp: string | null
  third: string | null
  regularSeasonTop: string
  pointsLeader: string
  playoffTeams: string[] // the championship bracket; empty while the season is in progress
  bracketGames: string[] // "week_no|manager" for each game a manager played while still alive
}

function championshipBracket(season: Side[], seeds: string[], playoffWeeks: number[]) {
  for (let n = 2; n <= seeds.length; n++) {
    const alive = new Set(seeds.slice(0, n))
    const knockedOut: string[][] = []
    const games: Side[] = []
    let fits = true
    for (const [i, week] of playoffWeeks.entries()) {
      const played = season.filter((s) => s.week_no === week && alive.has(s.manager))
      const isFinal = i === playoffWeeks.length - 1
      if (played.some((s) => !alive.has(s.opponent)) || (isFinal && played.length !== 2)) {
        fits = false
        break
      }
      games.push(...played)
      const losers = played.filter((s) => !s.win).map((s) => s.manager)
      knockedOut.push(losers)
      for (const l of losers) alive.delete(l)
    }
    if (!fits || alive.size !== 1) continue

    const finalWeek = playoffWeeks[playoffWeeks.length - 1]
    const title = games.find((s) => s.week_no === finalWeek && s.win)!
    const semiLosers = knockedOut[knockedOut.length - 2] ?? []
    const third = season.find(
      (s) => s.week_no === finalWeek && s.win && semiLosers.includes(s.manager) && semiLosers.includes(s.opponent)
    )
    return {
      teams: seeds.slice(0, n),
      games,
      champion: title.manager,
      runnerUp: title.opponent,
      third: third?.manager ?? null,
    }
  }
  return null
}

export function seasonResults(league: League, sides: Side[]): SeasonResult[] {
  return seasonsOf(league).map((year) => {
    const season = sides.filter((s) => s.year === year)
    const table = standings(season)
    const pointsLeader = [...table].sort((a, b) => b.pf - a.pf)[0].manager
    const playoffWeeks = league.weeks
      .filter((w) => w.year === year && w.is_playoff)
      .map((w) => w.week_no)
      .sort((a, b) => a - b)
    const finalPlayed = playoffWeeks.length > 0 && season.some((s) => s.week_no === playoffWeeks.at(-1))
    const division = new Map(league.teams.filter((t) => t.year === year).map((t) => [t.manager, t.division]))
    const seeds = playoffSeeds(table, (m) => division.get(m) ?? null)
    const bracket = finalPlayed ? championshipBracket(season, seeds, playoffWeeks) : null
    return {
      year,
      inProgress: !finalPlayed,
      champion: bracket?.champion ?? null,
      runnerUp: bracket?.runnerUp ?? null,
      third: bracket?.third ?? null,
      regularSeasonTop: table[0].manager,
      pointsLeader,
      playoffTeams: bracket?.teams ?? [],
      bracketGames: bracket?.games.map((s) => `${s.week_no}|${s.manager}`) ?? [],
    }
  })
}

export function playoffCounts(sides: Side[], results: SeasonResult[]) {
  const managers = [...new Set(sides.map((s) => s.manager))].sort()
  return managers
    .map((manager) => ({
      manager,
      appearances: results.filter((r) => r.playoffTeams.includes(manager)).length,
      titles: results.filter((r) => r.champion === manager).length,
    }))
    .sort((a, b) => b.titles - a.titles || b.appearances - a.appearances || a.manager.localeCompare(b.manager))
}

// ---------------------------------------------------------------------------------------------
// Scoring (all-time)

export type ScoringRow = {
  player: string
  GP: number
  Record: string
  "Win%": number
  PF: number
  PA: number
  PPG: number
  "PA/G": number
  Diff: number
  "Reg W-L": string
  "Top weeks": number
  "Bottom weeks": number
}

// Weeks each manager had the league's highest and lowest score: regular season, double weeks
// excluded (there are none in the regular season, but the rule holds if that changes)
function weekExtremes(sides: Side[]) {
  const tally = new Map<string, { top: number; bottom: number }>()
  for (const [, week] of groupBy(sides.filter((s) => !s.playoff && !s.double), (s) => `${s.year}|${s.week_no}`)) {
    const hi = Math.max(...week.map((s) => s.pf))
    const lo = Math.min(...week.map((s) => s.pf))
    for (const s of week) {
      const row = tally.get(s.manager) ?? { top: 0, bottom: 0 }
      tally.set(s.manager, row)
      row.top += s.pf === hi ? 1 : 0
      row.bottom += s.pf === lo ? 1 : 0
    }
  }
  return tally
}

export function scoringRows(sides: Side[], scope: Scope): ScoringRow[] {
  const pool = sides.filter(inScope(scope))
  const extremes = weekExtremes(pool)
  return [...groupBy(pool, (s) => s.manager)].map(([player, mine]) => {
    const w = mine.filter((s) => s.win).length
    const reg = mine.filter((s) => !s.playoff)
    const regW = reg.filter((s) => s.win).length
    // Per-game averages skip double weeks, which cover two NFL weeks
    const single = mine.filter((s) => !s.double)
    const pf = sum(mine.map((s) => s.pf))
    const pa = sum(mine.map((s) => s.pa))
    return {
      player,
      GP: mine.length,
      Record: record(w, mine.length - w),
      "Win%": round(pct(w, mine.length - w), 3),
      PF: round(pf),
      PA: round(pa),
      PPG: round(sum(single.map((s) => s.pf)) / single.length),
      "PA/G": round(sum(single.map((s) => s.pa)) / single.length),
      Diff: round(pf - pa),
      "Reg W-L": record(regW, reg.length - regW),
      "Top weeks": extremes.get(player)?.top ?? 0,
      "Bottom weeks": extremes.get(player)?.bottom ?? 0,
    }
  })
}

// League average score each week, one series per season: { week: "W1", "2024": 101.2, ... }.
// Double weeks are left out, so 2024's playoff weeks don't appear.
export function scoringTrend(sides: Side[]) {
  const single = sides.filter((s) => !s.double)
  const years = [...new Set(single.map((s) => s.year))].sort((a, b) => a - b)
  const order = (short: string) => (short[0] === "P" ? 100 : 0) + Number(short.slice(1))
  const weeks = [...new Set(single.map((s) => s.short))].sort((a, b) => order(a) - order(b))
  const data = weeks.map((week) => ({
    week,
    ...Object.fromEntries(
      years.flatMap((y) => {
        const pfs = single.filter((s) => s.year === y && s.short === week).map((s) => s.pf)
        return pfs.length ? [[String(y), round(sum(pfs) / pfs.length, 1)]] : []
      })
    ),
  }))
  return { years: years.map(String), data }
}

// Regular-season PPG against playoff-week PPG, consolation games included. A double week counts
// as two weeks, so its points are halved rather than the game being dropped (2024's playoffs were
// all double weeks).
export function playoffRisers(sides: Side[]) {
  return [...groupBy(sides, (s) => s.manager)]
    .flatMap(([manager, mine]) => {
      const reg = mine.filter((s) => !s.playoff && !s.double)
      const post = mine.filter((s) => s.playoff)
      if (!reg.length || !post.length) return []
      const regular = round(sum(reg.map((s) => s.pf)) / reg.length, 1)
      const playoffs = round(sum(post.map((s) => (s.double ? s.pf / 2 : s.pf))) / post.length, 1)
      return [{ manager, regular, playoffs, change: round(playoffs - regular, 1), weeks: post.length }]
    })
    .sort((a, b) => b.change - a.change)
}

// ---------------------------------------------------------------------------------------------
// Season story

export type WeekResult = "W" | "L" | "bye" | null // null: not played yet

// One week's award winners, each as "who" plus the detail line ("145.20", "over Andy, +62.10")
export type Award = { who: string; detail: string; value: number }
export type WeekAwards = {
  week: string
  top: Award
  low: Award
  blowout: Award
  closest: Award
  combined: Award
  lowCombined: Award
  bestLoss: Award
  worstWin: Award
}

export type SeasonStory = {
  year: number
  managers: string[]
  weeklyScores: Record<string, string | number>[] // { week: "W1", median: 104.2, Logan: 98.1, ... }
  weekLabels: string[]
  standings: { manager: string; wins: number; losses: number; pf: number; pa: number; results: WeekResult[] }[]
  awards: WeekAwards[]
}

const best = <T,>(xs: T[], score: (x: T) => number) => xs.reduce((a, b) => (score(b) > score(a) ? b : a))

export function seasonStory(league: League, sides: Side[], year: number): SeasonStory {
  const managers = managersIn(league, year)
  const season = sides.filter((s) => s.year === year)
  const weeks = league.weeks.filter((w) => w.year === year).sort((a, b) => a.week_no - b.week_no)
  const playedRegular = weeks.filter((w) => !w.is_playoff && season.some((s) => s.week_no === w.week_no))
  const scheduled = new Set(league.games.filter((g) => g.year === year).map((g) => `${g.week_no}|${g.manager}`))
  const short = shortLabels(weeks)
  const x = (w: Week) => short.get(`${w.year}|${w.week_no}`)!

  const weeklyScores = playedRegular.map((w) => {
    const thisWeek = season.filter((s) => s.week_no === w.week_no)
    return {
      week: x(w),
      median: round(median(thisWeek.map((s) => s.pf))),
      ...Object.fromEntries(thisWeek.map((s) => [s.manager, s.pf])),
    }
  })
  const table = standings(season)

  // The record book's categories, week by week. Double weeks are included and labelled as such.
  const score = (s: Side): Award => ({ who: s.manager, detail: s.pf.toFixed(2), value: s.pf })
  const game = (s: Side, value: number, shown: string): Award => ({ who: s.manager, detail: `over ${s.opponent}, ${shown}`, value })
  const awards = weeks.flatMap((w) => {
    const thisWeek = season.filter((s) => s.week_no === w.week_no)
    const winners = thisWeek.filter((s) => s.win)
    const losers = thisWeek.filter((s) => !s.win)
    if (!winners.length || !losers.length) return []
    const blowout = best(winners, (s) => s.pf - s.pa)
    const closest = best(winners, (s) => s.pa - s.pf)
    const combined = best(winners, (s) => s.pf + s.pa)
    const lowCombined = best(winners, (s) => -(s.pf + s.pa))
    const bestLoss = best(losers, (s) => s.pf)
    const worstWin = best(winners, (s) => -s.pf)
    return [{
      week: w.is_double_week ? `${x(w)} (double)` : x(w),
      top: score(best(thisWeek, (s) => s.pf)),
      low: score(best(thisWeek, (s) => -s.pf)),
      blowout: game(blowout, blowout.pf - blowout.pa, `+${(blowout.pf - blowout.pa).toFixed(2)}`),
      closest: game(closest, closest.pf - closest.pa, `+${(closest.pf - closest.pa).toFixed(2)}`),
      combined: game(combined, combined.pf + combined.pa, `${(combined.pf + combined.pa).toFixed(2)} total`),
      lowCombined: game(lowCombined, lowCombined.pf + lowCombined.pa, `${(lowCombined.pf + lowCombined.pa).toFixed(2)} total`),
      bestLoss: { who: bestLoss.manager, detail: `${bestLoss.pf.toFixed(2)}, lost to ${bestLoss.opponent}`, value: bestLoss.pf },
      worstWin: { who: worstWin.manager, detail: `${worstWin.pf.toFixed(2)}, beat ${worstWin.opponent}`, value: worstWin.pf },
    }]
  })

  return {
    year,
    managers,
    weeklyScores,
    awards,
    weekLabels: weeks.map((w) => w.label),
    standings: table.map((row) => ({
      ...row,
      results: weeks.map((w) => {
        const s = season.find((s) => s.week_no === w.week_no && s.manager === row.manager)
        if (s) return s.win ? "W" : "L"
        // Not played yet: scheduled without points, or a later playoff round with no games set.
        // Otherwise the manager had no game that week: a bye.
        const weekSet = league.games.some((g) => g.year === year && g.week_no === w.week_no)
        return !weekSet || scheduled.has(`${w.week_no}|${row.manager}`) ? null : "bye"
      }),
    })),
  }
}

// Regular-season PPG in each half of every season, split at the season's midpoint; an
// in-progress season has no second half until it gets there. Double weeks are left out.
export type Halves = { first: number | null; second: number | null; change: number | null }

export function strongFinish(league: League, sides: Side[]) {
  const years = seasonsOf(league).sort((a, b) => a - b)
  const managers = [...new Set(league.teams.map((t) => t.manager))]
  const ppg = (xs: Side[]) => (xs.length ? round(sum(xs.map((s) => s.pf)) / xs.length, 1) : null)
  const rows = managers.map((manager) => {
    const bySeason: Record<number, Halves | null> = {}
    for (const year of years) {
      const mine = sides.filter((s) => s.year === year && s.manager === manager && !s.playoff && !s.double)
      if (!mine.length) {
        bySeason[year] = null
        continue
      }
      const regularWeeks = league.weeks.filter((w) => w.year === year && !w.is_playoff).length
      const first = ppg(mine.filter((s) => s.week_no <= regularWeeks / 2))
      const second = ppg(mine.filter((s) => s.week_no > regularWeeks / 2))
      bySeason[year] = { first, second, change: first != null && second != null ? round(second - first, 1) : null }
    }
    const changes = Object.values(bySeason).flatMap((h) => (h?.change == null ? [] : [h.change]))
    return { manager, bySeason, average: changes.length ? round(sum(changes) / changes.length, 1) : null }
  })
  rows.sort((a, b) => (b.average ?? -Infinity) - (a.average ?? -Infinity) || a.manager.localeCompare(b.manager))
  return { years, rows }
}

// ---------------------------------------------------------------------------------------------
// Luck: regular season only, double weeks excluded (there are none in the regular season, but the
// rule holds if that changes).

export type LuckRow = {
  player: string
  Record: string
  "All-play": string
  "All-play%": number
  "Exp W": number
  Luck: number
  Median: string
  "Lucky W": number // won while scoring below the week's median
  "Unlucky L": number // lost while scoring above it
  Close: string // record in games decided by under 5 points
}

export const CLOSE_GAME = 5

export function luckRows(sides: Side[], scope: Scope): LuckRow[] {
  const pool = sides.filter((s) => !s.playoff && !s.double && inScope(scope)(s))
  type Tally = { w: number; apW: number; apL: number; exp: number; medW: number; gp: number; lucky: number; unlucky: number; closeW: number; closeL: number }
  const stats = new Map<string, Tally>()
  for (const [, week] of groupBy(pool, (s) => `${s.year}|${s.week_no}`)) {
    const scores = week.map((s) => s.pf)
    const mid = median(scores)
    for (const s of week) {
      const row = stats.get(s.manager) ?? { w: 0, apW: 0, apL: 0, exp: 0, medW: 0, gp: 0, lucky: 0, unlucky: 0, closeW: 0, closeL: 0 }
      stats.set(s.manager, row)
      const beat = scores.filter((x) => x < s.pf).length
      row.gp++
      row.w += s.win ? 1 : 0
      row.apW += beat
      row.apL += week.length - 1 - beat
      row.exp += beat / (week.length - 1)
      row.medW += s.pf > mid ? 1 : 0
      row.lucky += s.win && s.pf < mid ? 1 : 0
      row.unlucky += !s.win && s.pf > mid ? 1 : 0
      if (Math.abs(s.pf - s.pa) < CLOSE_GAME) row[s.win ? "closeW" : "closeL"]++
    }
  }
  return [...stats].map(([player, r]) => ({
    player,
    Record: record(r.w, r.gp - r.w),
    "All-play": record(r.apW, r.apL),
    "All-play%": round(pct(r.apW, r.apL), 3),
    "Exp W": round(r.exp, 1),
    Luck: round(r.w - r.exp, 1),
    Median: record(r.medW, r.gp - r.medW),
    "Lucky W": r.lucky,
    "Unlucky L": r.unlucky,
    Close: record(r.closeW, r.closeL),
  }))
}

// ---------------------------------------------------------------------------------------------
// Record book (all-time; double weeks excluded from single-game records)

export type GameLine = { manager: string; opponent: string; pf: number; pa: number; year: number; label: string; short: string }
export type Streak = { manager: string; length: number; kind: "W" | "L"; from: string; to: string }

export const line = (s: Side): GameLine => ({
  manager: s.manager, opponent: s.opponent, pf: s.pf, pa: s.pa, year: s.year, label: s.label, short: s.short,
})
const when = (s: Side) => `${s.year} ${s.short}`

// One manager's games (in order) split into win and loss streaks, oldest first
export function streaks(manager: string, mine: Side[]): Streak[] {
  const runs: Side[][] = []
  for (const s of mine) {
    const run = runs[runs.length - 1]
    if (run && run[0].win === s.win) run.push(s)
    else runs.push([s])
  }
  return runs.map((r) => ({
    manager, length: r.length, kind: r[0].win ? "W" : "L", from: when(r[0]), to: when(r[r.length - 1]),
  }))
}

const SNAP_STREAK = 3
const HOT_COLD_GAMES = 10

export function recordBook(sides: Side[], activeManagers: string[]) {
  const single = sides.filter((s) => !s.double)
  const winners = single.filter((s) => s.win)
  const byScore = [...single].sort((a, b) => b.pf - a.pf)
  const byMargin = [...winners].sort((a, b) => b.pf - b.pa - (a.pf - a.pa))
  const byCombined = [...winners].sort((a, b) => b.pf + b.pa - (a.pf + a.pa))
  const losers = single.filter((s) => !s.win)
  const highestLoss = losers.reduce((best, s) => (s.pf > best.pf ? s : best))
  const lowestWin = winners.reduce((best, s) => (s.pf < best.pf ? s : best))

  // Streaks run across seasons and include playoffs
  const longest: Streak[] = []
  const current: Streak[] = []
  for (const [manager, mine] of groupBy(sides, (s) => s.manager)) {
    const runs = streaks(manager, mine)
    longest.push(...runs)
    if (activeManagers.includes(manager)) current.push(runs[runs.length - 1])
  }
  const top = (kind: "W" | "L") => longest.filter((s) => s.kind === kind).sort((a, b) => b.length - a.length)

  // Streak snapper: wins over an opponent who came in on a win streak of SNAP_STREAK or more.
  // Sides are in week order, so each manager's running streak is the one they carry into the game.
  const running = new Map<string, number>()
  const snaps = new Map<string, { opponent: string; length: number; when: string }[]>()
  for (const [, week] of groupBy(sides, (s) => `${s.year}|${s.week_no}`)) {
    for (const s of week) {
      const theirs = running.get(s.opponent) ?? 0
      if (s.win && theirs >= SNAP_STREAK) snaps.set(s.manager, [...(snaps.get(s.manager) ?? []), { opponent: s.opponent, length: theirs, when: when(s) }])
    }
    for (const s of week) running.set(s.manager, s.win ? (running.get(s.manager) ?? 0) + 1 : 0)
  }
  const snapper = [...snaps]
    .map(([manager, list]) => ({ manager, count: list.length, biggest: list.reduce((a, b) => (b.length > a.length ? b : a)) }))
    .sort((a, b) => b.count - a.count || b.biggest.length - a.biggest.length)[0] ?? null

  // Hot and cold: the share of games whose result differs from the game before
  const hotCold = [...groupBy(sides, (s) => s.manager)]
    .filter(([, mine]) => mine.length >= HOT_COLD_GAMES)
    .map(([manager, mine]) => {
      const flips = mine.slice(1).filter((s, i) => s.win !== mine[i].win).length
      return { manager, flips, of: mine.length - 1, rate: flips / (mine.length - 1) }
    })
    .sort((a, b) => b.rate - a.rate || b.of - a.of)[0] ?? null

  return {
    highest: line(byScore[0]),
    lowest: line(byScore[byScore.length - 1]),
    blowout: line(byMargin[0]),
    closest: line(byMargin[byMargin.length - 1]),
    combined: line(byCombined[0]),
    lowestCombined: line(byCombined[byCombined.length - 1]),
    longestWin: top("W")[0],
    longestLoss: top("L")[0],
    topScores: byScore.slice(0, 10).map(line),
    topBlowouts: byMargin.slice(0, 10).map(line),
    highestLoss: line(highestLoss),
    lowestWin: line(lowestWin),
    snapper,
    hotCold,
    currentStreaks: current.sort((a, b) => (b.kind === "W" ? b.length : -b.length) - (a.kind === "W" ? a.length : -a.length)),
  }
}

// Best and worst seasons. Only seasons whose regular season is over count, so a hot start can't
// top the list. Record and luck are regular season; scoring is per game over every game but double
// weeks, as on Scoring, since seasons differ in length.
export function regularSeasonOver(league: League, sides: Side[], year: number) {
  const regular = league.weeks.filter((w) => w.year === year && !w.is_playoff)
  return regular.length > 0 && regular.every((w) => sides.some((s) => s.year === year && s.week_no === w.week_no))
}

export type SeasonLine = { manager: string; year: number; record: string; ppg: number; papg: number; luck: number; pct: number; pf: number }

export function seasonRecords(league: League, sides: Side[]) {
  const finished = seasonsOf(league).filter((year) => regularSeasonOver(league, sides, year))
  const lines: SeasonLine[] = finished.flatMap((year) => {
    const luck = new Map(luckRows(sides, year).map((r) => [r.player, r.Luck]))
    return standings(sides.filter((s) => s.year === year)).map((r) => {
      const single = sides.filter((s) => s.year === year && s.manager === r.manager && !s.double)
      return {
        manager: r.manager,
        year,
        record: record(r.wins, r.losses),
        pct: pct(r.wins, r.losses),
        pf: r.pf,
        ppg: round(sum(single.map((s) => s.pf)) / single.length),
        papg: round(sum(single.map((s) => s.pa)) / single.length),
        luck: luck.get(r.manager) ?? 0,
      }
    })
  })
  if (!lines.length) return null
  const top = (score: (l: SeasonLine) => number) => lines.reduce((a, b) => (score(b) > score(a) ? b : a))
  return {
    best: top((l) => l.pct + l.pf / 1e6),
    worst: top((l) => -l.pct - l.pf / 1e6),
    highestPpg: top((l) => l.ppg),
    lowestPpg: top((l) => -l.ppg),
    highestPapg: top((l) => l.papg),
    lowestPapg: top((l) => -l.papg),
    luckiest: top((l) => l.luck),
    unluckiest: top((l) => -l.luck),
  }
}

// ---------------------------------------------------------------------------------------------
// Rivalries

export function rivalry(sides: Side[], a: string, b: string) {
  const games = sides.filter((s) => s.manager === a && s.opponent === b)
  const wins = games.filter((s) => s.win).length
  const last = games[games.length - 1]
  let streak = 0
  for (const s of [...games].reverse()) {
    if (s.win !== last.win) break
    streak++
  }
  return {
    games: games.map((s) => ({ ...line(s), when: when(s), margin: round(s.pf - s.pa), playoff: s.playoff })),
    wins,
    losses: games.length - wins,
    pf: round(sum(games.map((s) => s.pf))),
    pa: round(sum(games.map((s) => s.pa))),
    streak: last ? { holder: last.win ? a : b, length: streak } : null,
  }
}

export function closestRivalries(sides: Side[], minGames = 3) {
  const pairs = groupBy(
    sides.filter((s) => s.manager < s.opponent),
    (s) => `${s.manager}|${s.opponent}`
  )
  return [...pairs]
    .filter(([, games]) => games.length >= minGames)
    .map(([key, games]) => {
      const [a, b] = key.split("|")
      const aWins = games.filter((s) => s.win).length
      const [leader, trailer, lw, tw] = aWins >= games.length - aWins ? [a, b, aWins, games.length - aWins] : [b, a, games.length - aWins, aWins]
      return {
        pair: `${leader} vs ${trailer}`,
        games: games.length,
        series: `${leader} leads ${record(lw, tw)}`,
        even: lw === tw,
        // The leader's share of the wins: 0.5 is a tied series, 1 a clean sweep
        share: lw / games.length,
        avgMargin: round(sum(games.map((s) => Math.abs(s.pf - s.pa))) / games.length, 1),
      }
    })
    // Most even series first, so 3-2 and 2-1 always rank above 3-0; margin only breaks ties
    .sort((x, y) => x.share - y.share || x.avgMargin - y.avgMargin)
    .map((r) => (r.even ? { ...r, series: `Tied ${r.series.split(" leads ")[1]}` } : r))
    .slice(0, 10)
}

// Each manager's worst losing and best winning head-to-head record against one opponent,
// all-time. Ties go to the opponent played most, then the most lopsided points (most outscored
// by for a nemesis, most outscoring for a victim), then alphabetical.
export function nemeses(sides: Side[], minGames = 2) {
  return [...groupBy(sides, (s) => s.manager)]
    .map(([manager, mine]) => {
      const opponents = [...groupBy(mine, (s) => s.opponent)]
        .filter(([, games]) => games.length >= minGames)
        .map(([opponent, games]) => {
          const w = games.filter((s) => s.win).length
          const diff = sum(games.map((s) => s.pf - s.pa))
          return { opponent, record: record(w, games.length - w), pct: pct(w, games.length - w), games: games.length, diff }
        })
      const byName = (a: { opponent: string }, b: { opponent: string }) => a.opponent.localeCompare(b.opponent)
      const nemesis = opponents.filter((o) => o.pct < 0.5).sort((a, b) => a.pct - b.pct || b.games - a.games || a.diff - b.diff || byName(a, b))[0]
      const victim = opponents.filter((o) => o.pct > 0.5).sort((a, b) => b.pct - a.pct || b.games - a.games || b.diff - a.diff || byName(a, b))[0]
      return { manager, nemesis: nemesis ?? null, victim: victim ?? null }
    })
    .sort((a, b) => a.manager.localeCompare(b.manager))
}

// ---------------------------------------------------------------------------------------------
// Divisions

export function divisions(league: League, sides: Side[], year: number) {
  const season = sides.filter((s) => s.year === year)
  const teams = league.teams.filter((t) => t.year === year)
  const names = [...new Set(teams.map((t) => t.division).filter((d): d is Division => d != null))].sort()
  if (!names.length) return null
  const table = standings(season)
  const tables = names.map((division) => ({
    division,
    rows: table
      .filter((r) => teams.find((t) => t.manager === r.manager)!.division === division)
      .map((r) => {
        const div = season.filter((s) => s.manager === r.manager && s.oppDivision === division && !s.playoff)
        const dw = div.filter((s) => s.win).length
        return { ...r, divRecord: record(dw, div.length - dw) }
      }),
  }))
  const inter = season.filter((s) => s.division !== s.oppDivision)
  const matrix = names.map((division) => ({
    division,
    vs: Object.fromEntries(
      names.map((other) => {
        const games = inter.filter((s) => s.division === division && s.oppDivision === other)
        const w = games.filter((s) => s.win).length
        return [other, other === division ? null : record(w, games.length - w)]
      })
    ),
  }))
  const interPct = names.map((division) => {
    const games = inter.filter((s) => s.division === division)
    const w = games.filter((s) => s.win).length
    return { division, pct: round(pct(w, games.length - w) * 100, 1), record: record(w, games.length - w) }
  })
  return { names, tables, matrix, interPct }
}

// Every season with divisions: each division's win % against the others, and its PPG.
export function divisionStrength(league: League, sides: Side[]) {
  const years = seasonsOf(league).sort((a, b) => a - b)
  const names = [...new Set(league.teams.map((t) => t.division).filter((d): d is Division => d != null))].sort()
  const seasons = years.flatMap((year) => {
    const season = sides.filter((s) => s.year === year && !s.playoff && s.division != null)
    if (!season.length) return []
    const winPct: Record<string, string | number> = { season: String(year) }
    const ppg: Record<string, string | number> = { season: String(year) }
    for (const d of names) {
      const inter = season.filter((s) => s.division === d && s.oppDivision !== d)
      const w = inter.filter((s) => s.win).length
      winPct[d] = round(pct(w, inter.length - w) * 100, 1)
      const single = season.filter((s) => s.division === d && !s.double)
      ppg[d] = round(sum(single.map((s) => s.pf)) / single.length, 1)
    }
    return [{ winPct, ppg }]
  })
  return { names, winPct: seasons.map((s) => s.winPct), ppg: seasons.map((s) => s.ppg) }
}

// ---------------------------------------------------------------------------------------------
// Power rankings. A ballot for week N is published after week N's games; it is "right" about a
// game in week N+1 when the higher-ranked manager wins it.

export type RankSource = Ranker | "Consensus"

export function powerRankings(league: League, sides: Side[]) {
  const year = latestYear(league)
  const ballots = league.powerRankings.filter((p) => p.year === year)
  const weeks = [...new Set(ballots.map((b) => b.week_no))].sort((a, b) => a - b)
  const managers = managersIn(league, year)
  const rankers: Ranker[] = ["Logan", "Andy", "ESPN"]

  const rankOf = (week: number, ranker: Ranker, m: string) =>
    ballots.find((b) => b.week_no === week && b.ranker === ranker && b.manager === m)!.rank
  // Average of all three ranks; ties go to the average of Andy's and Logan's. That always settles
  // it: equal on both means equal ESPN ranks, which one ballot can't have. Sums compare the same
  // as averages without floating-point noise.
  const consensus = (week: number) => {
    const scored = managers.map((m) => ({
      m,
      all: sum(rankers.map((r) => rankOf(week, r, m))),
      ours: rankOf(week, "Andy", m) + rankOf(week, "Logan", m),
    }))
    scored.sort((a, b) => a.all - b.all || a.ours - b.ours)
    return Object.fromEntries(scored.map(({ m }, i) => [m, { rank: i + 1 }]))
  }

  // { Consensus: [{ week: "W3", Logan: 4, ... }], Logan: [...], ... }
  const series = {} as Record<RankSource, Record<string, string | number>[]>
  for (const source of ["Consensus", ...rankers] as RankSource[]) {
    series[source] = weeks.map((w) => ({
      week: `W${w}`,
      ...Object.fromEntries(
        managers.map((m) => [m, source === "Consensus" ? consensus(w)[m].rank : rankOf(w, source, m)])
      ),
    }))
  }

  const consensusBy = new Map(weeks.map((w) => [w, consensus(w)]))
  const latest = weeks[weeks.length - 1]
  const c = consensusBy.get(latest)!
  const previous = weeks.length > 1 ? consensusBy.get(weeks[weeks.length - 2])! : null
  // Where each manager actually stood after the latest ballot's week: wins, then points for
  const standing = new Map(
    standings(sides.filter((s) => s.year === year && s.week_no <= latest)).map((r, i) => [r.manager, i + 1])
  )
  const latestTable = managers
    .map((m) => {
      const ranks = rankers.map((r) => rankOf(latest, r, m))
      const mine = sides.filter((s) => s.year === year && s.manager === m && s.week_no <= latest)
      const w = mine.filter((s) => s.win).length
      return {
        manager: m,
        Logan: ranks[0],
        Andy: ranks[1],
        ESPN: ranks[2],
        consensus: c[m].rank,
        // Places gained in the consensus since the ballot before (positive is up); null on the first
        move: previous ? previous[m].rank - c[m].rank : null,
        spread: Math.max(...ranks) - Math.min(...ranks),
        record: record(w, mine.length - w),
        standing: standing.get(m)!,
      }
    })
    .sort((a, b) => a.consensus - b.consensus)

  const accuracy = rankers.map((ranker) => {
    let right = 0
    let total = 0
    for (const w of weeks) {
      for (const s of sides.filter((s) => s.year === year && s.week_no === w + 1 && s.manager < s.opponent)) {
        total++
        const favoriteWon = rankOf(w, ranker, s.manager) < rankOf(w, ranker, s.opponent) === s.win
        if (favoriteWon) right++
      }
    }
    return { ranker, pct: round((right / (total || 1)) * 100, 1), right, total }
  })

  // How many spots higher (positive) or lower each ranker puts a manager than the consensus does,
  // averaged over every ballot
  const bias = managers.map((m) => ({
    manager: m,
    ...Object.fromEntries(
      rankers.map((r) => [
        r,
        round(sum(weeks.map((w) => consensusBy.get(w)![m].rank - rankOf(w, r, m))) / weeks.length, 1),
      ])
    ),
  })) as ({ manager: string } & Record<Ranker, number>)[]

  // Consensus moves from one ballot to the next; positive is up the rankings
  const moves = weeks.slice(1).flatMap((w, i) =>
    managers.map((m) => ({
      manager: m,
      week: `W${weeks[i]} → W${w}`,
      from: consensusBy.get(weeks[i])![m].rank,
      to: consensusBy.get(w)![m].rank,
      change: consensusBy.get(weeks[i])![m].rank - consensusBy.get(w)![m].rank,
    }))
  )
  const risers = [...moves].filter((x) => x.change > 0).sort((a, b) => b.change - a.change).slice(0, 5)
  const fallers = [...moves].filter((x) => x.change < 0).sort((a, b) => a.change - b.change).slice(0, 5)

  return {
    year,
    weeks: weeks.map((w) => `W${w}`),
    latest: `Week ${latest}`,
    managers,
    rankers,
    series,
    latestTable,
    accuracy,
    bias,
    risers,
    fallers,
  }
}

// ---------------------------------------------------------------------------------------------
// Looking ahead (current season's unplayed games)

export function lookingAhead(league: League, sides: Side[]) {
  const year = latestYear(league)
  const upcoming = league.games.filter((g) => g.year === year && g.points == null)
  if (!upcoming.length) return null
  const nextWeek = Math.min(...upcoming.map((g) => g.week_no))
  const label = league.weeks.find((w) => w.year === year && w.week_no === nextWeek)!.label
  const season = sides.filter((s) => s.year === year)
  const form = (m: string) => {
    const mine = season.filter((s) => s.manager === m)
    const w = mine.filter((s) => s.win).length
    return { record: record(w, mine.length - w), pct: pct(w, mine.length - w), ppg: round(sum(mine.map((s) => s.pf)) / mine.length) }
  }

  const matchups = upcoming
    .filter((g) => g.week_no === nextWeek && g.manager < g.opponent)
    .map((g) => {
      const h2h = rivalry(sides, g.manager, g.opponent)
      return {
        home: { manager: g.manager, ...form(g.manager) },
        away: { manager: g.opponent, ...form(g.opponent) },
        h2h: record(h2h.wins, h2h.losses),
        last: h2h.games.at(-1) ?? null,
      }
    })

  const schedule = managersIn(league, year)
    .map((m) => {
      const opps = upcoming.filter((g) => g.manager === m).map((g) => g.opponent)
      return {
        manager: m,
        oppPct: round(sum(opps.map((o) => form(o).pct)) / opps.length, 3),
        oppPpg: round(sum(opps.map((o) => form(o).ppg)) / opps.length, 1),
      }
    })
    .sort((a, b) => b.oppPct - a.oppPct)

  return { year, label, matchups, schedule }
}

// ---------------------------------------------------------------------------------------------
// Careers

export function careers(league: League, sides: Side[], results: SeasonResult[]) {
  const years = seasonsOf(league).sort((a, b) => a - b)
  const current = latestYear(league)
  const counts = new Map(playoffCounts(sides, results).map((c) => [c.manager, c]))
  const managers = [...new Set(league.teams.map((t) => t.manager))].sort()

  const rows = managers.map((manager) => {
    const mine = sides.filter((s) => s.manager === manager)
    const w = mine.filter((s) => s.win).length
    const seasons = league.teams.filter((t) => t.manager === manager).map((t) => t.year)
    return {
      manager,
      seasons: seasons.length,
      span: seasons.length > 1 ? `${Math.min(...seasons)}–${Math.max(...seasons)}` : String(seasons[0]),
      bySeason: Object.fromEntries(
        years.map((y) => {
          if (!seasons.includes(y)) return [y, null]
          const ys = mine.filter((s) => s.year === y)
          const yw = ys.filter((s) => s.win).length
          return [y, record(yw, ys.length - yw)]
        })
      ) as Record<number, string | null>,
      career: record(w, mine.length - w),
      pct: round(pct(w, mine.length - w), 3),
      titles: counts.get(manager)?.titles ?? 0,
      playoffs: counts.get(manager)?.appearances ?? 0,
      active: seasons.includes(current),
    }
  })

  return { years, managers, rows }
}

// PPG rank within each season (1 = the season's best), for every manager. Double weeks are left out.
export function scoringRanks(league: League, sides: Side[]) {
  const years = seasonsOf(league).sort((a, b) => a - b)
  const managers = [...new Set(league.teams.map((t) => t.manager))].sort()
  const ppgRank = new Map<string, Record<number, { ppg: number; rank: number; of: number }>>()
  for (const y of years) {
    const season = sides.filter((s) => s.year === y && !s.double)
    const table = [...groupBy(season, (s) => s.manager)]
      .map(([m, mine]) => ({ m, ppg: round(sum(mine.map((s) => s.pf)) / mine.length, 1) }))
      .sort((a, b) => b.ppg - a.ppg)
    table.forEach(({ m, ppg }, i) => {
      const row = ppgRank.get(m) ?? {}
      row[y] = { ppg, rank: i + 1, of: table.length }
      ppgRank.set(m, row)
    })
  }

  return { years, managers, ranks: Object.fromEntries(ppgRank) }
}

// Cumulative win % after every week, every game counted. For one season the x axis is that
// season's weeks; all-time it runs across seasons ("2024 W1", ...) as a career win %, and a
// manager's line breaks for seasons they weren't in the league. A line starts once the manager has
// MIN_GAMES games, so it doesn't open on a meaningless 1.000 or .000.
const MIN_GAMES = 4

export function winPctByWeek(league: League, sides: Side[], scope: Scope) {
  const pool = sides.filter(inScope(scope))
  const tally = new Map<string, { w: number; gp: number }>()
  const data = [...groupBy(pool, (s) => `${s.year}|${s.week_no}`).values()].map((week) => {
    const { year, short } = week[0]
    for (const s of week) {
      const t = tally.get(s.manager) ?? { w: 0, gp: 0 }
      tally.set(s.manager, t)
      t.gp++
      t.w += s.win ? 1 : 0
    }
    return {
      week: scope === "all" ? `${year} ${short}` : short,
      ...Object.fromEntries(
        managersIn(league, year).flatMap((m) => {
          const t = tally.get(m)
          return t && t.gp >= MIN_GAMES ? [[m, round(t.w / t.gp, 3)]] : []
        })
      ),
    }
  })
  return { managers: [...tally.keys()].sort(), data }
}
