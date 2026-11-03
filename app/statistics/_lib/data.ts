import "server-only"
import { cache } from "react"
import { getEspn } from "@/lib/espn"
import { getLeague } from "@/lib/league"
import { rosterBase } from "./espn/base"
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

// The ESPN feed, for the stats the league tables can't support (rosters, projections, the draft,
// moves), with the per-week lineup work every page using it starts from
export const getRosters = cache(async () => {
  const [{ sides }, espn] = await Promise.all([getStats(), getEspn()])
  return { espn, base: rosterBase(espn, sides) }
})
