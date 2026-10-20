// Every stat on the preview page, derived from the league tables. Double weeks are left out of
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

export const record = (w: number, l: number) => `${w}-${l}`
const pct = (w: number, l: number) => (w + l ? w / (w + l) : 0)
const round = (x: number, places = 2) => Math.round(x * 10 ** places) / 10 ** places
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length / 2
  return s.length % 2 ? s[Math.floor(mid)] : (s[mid - 1] + s[mid]) / 2
}
const groupBy = <T, K>(xs: T[], key: (x: T) => K) => {
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
function standings(sides: Side[]) {
  return [...groupBy(sides.filter((s) => !s.playoff), (s) => s.manager)]
    .map(([manager, mine]) => {
      const wins = mine.filter((s) => s.win).length
      return { manager, wins, losses: mine.length - wins, pf: round(sum(mine.map((s) => s.pf))), pa: round(sum(mine.map((s) => s.pa))) }
    })
    .sort((a, b) => b.wins - a.wins || b.pf - a.pf)
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
    const bracket = finalPlayed ? championshipBracket(season, table.map((r) => r.manager), playoffWeeks) : null
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
  "Playoff W-L": string
  "Playoff apps": number
  Titles: number
}

export function scoringRows(sides: Side[], results: SeasonResult[]): ScoringRow[] {
  const counts = new Map(playoffCounts(sides, results).map((c) => [c.manager, c]))
  const bracketGames = new Set(results.flatMap((r) => r.bracketGames.map((key) => `${r.year}|${key}`)))
  return [...groupBy(sides, (s) => s.manager)].map(([player, mine]) => {
    const w = mine.filter((s) => s.win).length
    const reg = mine.filter((s) => !s.playoff)
    // Championship-bracket games only; consolation games count toward the overall record
    const post = mine.filter((s) => bracketGames.has(`${s.year}|${s.week_no}|${s.manager}`))
    const regW = reg.filter((s) => s.win).length
    const postW = post.filter((s) => s.win).length
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
      "Playoff W-L": record(postW, post.length - postW),
      "Playoff apps": counts.get(player)?.appearances ?? 0,
      Titles: counts.get(player)?.titles ?? 0,
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Season story

export type WeekResult = "W" | "L" | "bye" | null // null: not played yet

export type SeasonStory = {
  year: number
  managers: string[]
  cumulative: Record<string, string | number>[] // { week: "W1", Logan: 1, ... }
  weeklyScores: Record<string, string | number>[] // { week: "W1", median: 104.2, Logan: 98.1, ... }
  weekLabels: string[]
  standings: { manager: string; wins: number; losses: number; pf: number; pa: number; results: WeekResult[] }[]
}

export function seasonStory(league: League, sides: Side[], year: number): SeasonStory {
  const managers = managersIn(league, year)
  const season = sides.filter((s) => s.year === year)
  const weeks = league.weeks.filter((w) => w.year === year).sort((a, b) => a.week_no - b.week_no)
  const playedRegular = weeks.filter((w) => !w.is_playoff && season.some((s) => s.week_no === w.week_no))
  const scheduled = new Set(league.games.filter((g) => g.year === year).map((g) => `${g.week_no}|${g.manager}`))
  const short = shortLabels(weeks)
  const x = (w: Week) => short.get(`${w.year}|${w.week_no}`)!

  const wins = Object.fromEntries(managers.map((m) => [m, 0]))
  const cumulative = playedRegular.map((w) => {
    for (const s of season.filter((s) => s.week_no === w.week_no && s.win)) wins[s.manager]++
    return { week: x(w), ...wins }
  })
  const weeklyScores = playedRegular.map((w) => {
    const thisWeek = season.filter((s) => s.week_no === w.week_no)
    return {
      week: x(w),
      median: round(median(thisWeek.map((s) => s.pf))),
      ...Object.fromEntries(thisWeek.map((s) => [s.manager, s.pf])),
    }
  })
  const table = standings(season)
  return {
    year,
    managers,
    cumulative,
    weeklyScores,
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
  "Top weeks": number
  "Bottom weeks": number
}

export function luckRows(sides: Side[], year: number | "all"): LuckRow[] {
  const pool = sides.filter((s) => !s.playoff && !s.double && (year === "all" || s.year === year))
  const stats = new Map<string, { w: number; apW: number; apL: number; exp: number; medW: number; top: number; bottom: number; gp: number }>()
  for (const [, week] of groupBy(pool, (s) => `${s.year}|${s.week_no}`)) {
    const scores = week.map((s) => s.pf)
    const mid = median(scores)
    const hi = Math.max(...scores)
    const lo = Math.min(...scores)
    for (const s of week) {
      const row = stats.get(s.manager) ?? { w: 0, apW: 0, apL: 0, exp: 0, medW: 0, top: 0, bottom: 0, gp: 0 }
      stats.set(s.manager, row)
      const beat = scores.filter((x) => x < s.pf).length
      row.gp++
      row.w += s.win ? 1 : 0
      row.apW += beat
      row.apL += week.length - 1 - beat
      row.exp += beat / (week.length - 1)
      row.medW += s.pf > mid ? 1 : 0
      row.top += s.pf === hi ? 1 : 0
      row.bottom += s.pf === lo ? 1 : 0
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
    "Top weeks": r.top,
    "Bottom weeks": r.bottom,
  }))
}

// ---------------------------------------------------------------------------------------------
// Record book (all-time; double weeks excluded from single-game records)

export type GameLine = { manager: string; opponent: string; pf: number; pa: number; year: number; label: string; short: string }
export type Streak = { manager: string; length: number; kind: "W" | "L"; from: string; to: string }

const line = (s: Side): GameLine => ({
  manager: s.manager, opponent: s.opponent, pf: s.pf, pa: s.pa, year: s.year, label: s.label, short: s.short,
})
const when = (s: Side) => `${s.year} ${s.short}`

export function recordBook(sides: Side[], activeManagers: string[]) {
  const single = sides.filter((s) => !s.double)
  const winners = single.filter((s) => s.win)
  const byScore = [...single].sort((a, b) => b.pf - a.pf)
  const byMargin = [...winners].sort((a, b) => b.pf - b.pa - (a.pf - a.pa))
  const byCombined = [...winners].sort((a, b) => b.pf + b.pa - (a.pf + a.pa))

  // Streaks run across seasons and include playoffs
  const longest: Streak[] = []
  const current: Streak[] = []
  for (const [manager, mine] of groupBy(sides, (s) => s.manager)) {
    let run: Side[] = []
    const runs: Side[][] = []
    for (const s of mine) {
      if (run.length && run[0].win !== s.win) {
        runs.push(run)
        run = []
      }
      run.push(s)
    }
    runs.push(run)
    const toStreak = (r: Side[]): Streak => ({
      manager, length: r.length, kind: r[0].win ? "W" : "L", from: when(r[0]), to: when(r[r.length - 1]),
    })
    longest.push(...runs.map(toStreak))
    if (activeManagers.includes(manager)) current.push(toStreak(run))
  }
  const top = (kind: "W" | "L") => longest.filter((s) => s.kind === kind).sort((a, b) => b.length - a.length)

  return {
    highest: line(byScore[0]),
    lowest: line(byScore[byScore.length - 1]),
    blowout: line(byMargin[0]),
    closest: line(byMargin[byMargin.length - 1]),
    combined: line(byCombined[0]),
    longestWin: top("W")[0],
    longestLoss: top("L")[0],
    topScores: byScore.slice(0, 10).map(line),
    topBlowouts: byMargin.slice(0, 10).map(line),
    currentStreaks: current.sort((a, b) => (b.kind === "W" ? b.length : -b.length) - (a.kind === "W" ? a.length : -a.length)),
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
        avgMargin: round(sum(games.map((s) => Math.abs(s.pf - s.pa))) / games.length, 1),
      }
    })
    .sort((x, y) => Number(y.even) - Number(x.even) || x.avgMargin - y.avgMargin)
    .map((r) => (r.even ? { ...r, series: `Tied ${r.series.split(" leads ")[1]}` } : r))
    .slice(0, 10)
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

  const latest = weeks[weeks.length - 1]
  const c = consensus(latest)
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
        spread: Math.max(...ranks) - Math.min(...ranks),
        record: record(w, mine.length - w),
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

  return { year, weeks: weeks.map((w) => `W${w}`), latest: `Week ${latest}`, managers, series, latestTable, accuracy }
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
        remaining: opps.length,
        oppPct: round((sum(opps.map((o) => form(o).pct)) / opps.length) * 100, 1),
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

  // One row per season; managers who weren't in the league that year are left out (a gap in the line)
  const winPctBySeason = years.map((y) => ({
    season: String(y),
    ...Object.fromEntries(
      managers.flatMap((m) => {
        const ys = sides.filter((s) => s.year === y && s.manager === m)
        if (!ys.length) return []
        return [[m, round(pct(ys.filter((s) => s.win).length, ys.filter((s) => !s.win).length) * 100, 1)]]
      })
    ),
  }))

  return { years, managers, rows, winPctBySeason }
}
