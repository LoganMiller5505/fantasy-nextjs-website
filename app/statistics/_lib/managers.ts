// One page per manager: their career at a glance, season by season, and against each opponent.
// Everything is all-time and counts every game unless it says otherwise.

import type { League } from "@/lib/league"
import { playoffHistory } from "./playoffs"
import {
  groupBy,
  line,
  luckRows,
  nemeses,
  pct,
  record,
  regularSeasonOver,
  round,
  scoringRanks,
  seasonsOf,
  standings,
  streaks,
  sum,
  type SeasonResult,
  type Side,
} from "./stats"

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`

export type ProfileSeason = {
  year: number
  record: string // regular season
  finish: string // regular-season place: "3rd of 12"
  ppg: number | null
  ppgRank: string | null
  luck: number | null
  playoffs: string // "Champion", "Out in Round 1", "Missed", "In progress"
  over: boolean // the regular season is finished
}

export type Opponent = {
  opponent: string
  games: number
  record: string
  pct: number
  pf: number
  pa: number
  margin: number // average, signed
  last: string // "W, 2026 W5"
  tag: "Nemesis" | "Favourite victim" | null
}

export function managerProfiles(league: League, sides: Side[], results: SeasonResult[]) {
  const history = playoffHistory(league, sides, results)
  const ranks = scoringRanks(league, sides).ranks
  const years = seasonsOf(league) // newest first
  const over = new Map(years.map((y) => [y, regularSeasonOver(league, sides, y)]))
  const tables = new Map(years.map((y) => [y, standings(sides.filter((s) => s.year === y))]))
  const luck = new Map(years.map((y) => [y, new Map(luckRows(sides, y).map((r) => [r.player, r.Luck]))]))
  const careerLuck = new Map(luckRows(sides, "all").map((r) => [r.player, r.Luck]))
  const foes = new Map(nemeses(sides).map((f) => [f.manager, f]))
  const current = Math.max(...years)
  const managers = [...new Set(league.teams.map((t) => t.manager))].sort()

  return Object.fromEntries(
    managers.map((manager) => {
      const mine = sides.filter((s) => s.manager === manager)
      const played = league.teams.filter((t) => t.manager === manager).map((t) => t.year)
      const w = mine.filter((s) => s.win).length

      const seasons: ProfileSeason[] = years
        .filter((y) => played.includes(y))
        .map((year) => {
          const table = tables.get(year)!
          const place = table.findIndex((r) => r.manager === manager)
          const row = table[place]
          const finish = history.finishes.find((f) => f.year === year && f.manager === manager)
          const result = results.find((r) => r.year === year)!
          const rank = ranks[manager]?.[year]
          return {
            year,
            record: row ? record(row.wins, row.losses) : "0-0",
            finish: row ? `${ordinal(place + 1)} of ${table.length}` : "—",
            ppg: rank?.ppg ?? null,
            ppgRank: rank ? `${ordinal(rank.rank)} of ${rank.of}` : null,
            luck: luck.get(year)!.get(manager) ?? null,
            playoffs: finish ? finish.label : result.inProgress ? "In progress" : "Missed",
            over: over.get(year)!,
          }
        })

      // Best finished regular season: highest place, then the better record
      const bestSeason = seasons
        .filter((s) => s.over)
        .map((s) => ({ ...s, place: Number.parseInt(s.finish) }))
        .sort((a, b) => a.place - b.place || b.record.localeCompare(a.record, undefined, { numeric: true }))[0]

      const runs = streaks(manager, mine)
      const single = mine.filter((s) => !s.double)
      const highest = single.length ? line(single.reduce((a, b) => (b.pf > a.pf ? b : a))) : null
      const finishes = history.finishes.filter((f) => f.manager === manager)
      const foe = foes.get(manager)

      const opponents: Opponent[] = [...groupBy(mine, (s) => s.opponent)]
        .map(([opponent, games]) => {
          const ow = games.filter((s) => s.win).length
          const last = games[games.length - 1]
          return {
            opponent,
            games: games.length,
            record: record(ow, games.length - ow),
            pct: round(pct(ow, games.length - ow), 3),
            pf: round(sum(games.map((s) => s.pf))),
            pa: round(sum(games.map((s) => s.pa))),
            margin: round(sum(games.map((s) => s.pf - s.pa)) / games.length, 1),
            last: `${last.win ? "W" : "L"}, ${last.year} ${last.short}`,
            tag:
              foe?.nemesis?.opponent === opponent ? ("Nemesis" as const)
              : foe?.victim?.opponent === opponent ? ("Favourite victim" as const)
              : null,
          }
        })
        .sort((a, b) => b.pct - a.pct || b.games - a.games)

      return [
        manager,
        {
          manager,
          active: played.includes(current),
          span: played.length > 1 ? `${Math.min(...played)}–${Math.max(...played)}` : String(played[0]),
          seasonCount: played.length,
          career: { record: record(w, mine.length - w), pct: round(pct(w, mine.length - w), 3) },
          titles: finishes.filter((f) => f.place === 1).length,
          finals: finishes.filter((f) => f.place <= 2).length,
          playoffTrips: finishes.length,
          bracketSeasons: played.filter((y) => history.years.includes(y)).length,
          bestSeason: bestSeason ? { year: bestSeason.year, finish: ordinal(bestSeason.place), record: bestSeason.record } : null,
          highest,
          currentStreak: runs[runs.length - 1] ?? null,
          longestWin: runs.filter((r) => r.kind === "W").sort((a, b) => b.length - a.length)[0] ?? null,
          luck: careerLuck.get(manager) ?? 0,
          seasons,
          opponents,
        },
      ]
    })
  )
}

export type ManagerProfile = ReturnType<typeof managerProfiles>[string]
