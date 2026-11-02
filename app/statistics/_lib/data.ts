import "server-only"
import { cache } from "react"
import { getEspn } from "@/lib/espn"
import { getLeague } from "@/lib/league"
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

// The ESPN feed, for the stats the league tables can't support (rosters, projections, the draft, moves)
export const getEspnData = cache(getEspn)
