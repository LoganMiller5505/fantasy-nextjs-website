import "server-only"
import { createHash } from "node:crypto"
import { unstable_cache } from "next/cache"
import { cache } from "react"
import { getLeague, type League } from "@/lib/league"
import { oddsAfterWeek, playedWeeks, playoffRace, type Race } from "./playoff-race"
import { latestYear, playedSides, seasonResults, seasonsOf } from "./stats"

// The league and the derivations every page starts from, loaded once per request
export const getStats = cache(async () => {
  const league = await getLeague()
  const sides = playedSides(league)
  return {
    league,
    sides,
    results: seasonResults(league, sides),
    seasons: seasonsOf(league), // newest first
    current: latestYear(league),
  }
})

// The playoff-race simulations take seconds, so their results are kept until the scores they're
// worked out from change, rather than redone on every rebuild of the page (every few minutes). Each
// result is keyed by a fingerprint of exactly what it depends on, plus the build: a new deploy may
// change the model, so it starts afresh. In development the stamp changes whenever this module
// reloads, so an edit to the model shows up straight away.
const BUILD = process.env.NODE_ENV === "development" ? `dev-${Date.now()}` : (process.env.STATS_BUILD ?? "build")

const fingerprint = (value: unknown) => createHash("sha1").update(JSON.stringify(value)).digest("hex")

const kept = <T>(key: string[], compute: () => T) => unstable_cache(async () => compute(), ["playoff-race", BUILD, ...key])()

// What the odds now depend on: every season (the latest finished one sets the playoff format)
const leagueKey = (league: League) => fingerprint([league.teams, league.weeks, league.games])

// What the odds after `week` depend on: earlier seasons, this season's teams and calendar, and
// this season's scores up to that week (later games count only as the schedule)
const weekKey = (league: League, week: number) => {
  const year = latestYear(league)
  return fingerprint([
    league.teams,
    league.weeks,
    league.games.map((g) => (g.year === year && g.week_no > week ? { ...g, points: null } : g)),
  ])
}

// The odds now, for the Season page's tiles and Outlook. Null once the regular season is over.
export const getCurrentRace = cache(async () => {
  const { league, sides, results } = await getStats()
  return kept(["now", leagueKey(league)], () => playoffRace(league, sides, results))
})

// The odds now plus how they stood after each week played. A past week's odds never change, so an
// upload only adds the new week's.
export const getPlayoffRace = cache(async (): Promise<Race | null> => {
  const now = await getCurrentRace()
  if (!now) return null
  const { league, sides, results } = await getStats()
  const trend = []
  for (const week of playedWeeks(league, sides)) {
    trend.push(await kept(["week", String(week), weekKey(league, week)], () => oddsAfterWeek(league, sides, results, week)))
  }
  return {
    ...now,
    playoffsByWeek: trend.map((t) => t!.playoffs),
    divisionByWeek: trend.map((t) => t!.division),
  }
})
