import { getStats } from "../_lib/data"
import { consistency } from "../_lib/more-stats"
import { parseScope } from "../_lib/scope"
import { scoringRanks, scoringRows, scoringTrend, strongFinish, type Scope } from "../_lib/stats"
import { ScoringView } from "../_sections/scoring"

export default async function ScoringPage({ searchParams }: { searchParams: Promise<{ season?: string | string[] }> }) {
  const { league, sides, seasons } = await getStats()
  const scopes: Scope[] = ["all", ...seasons]
  const byScope = <T,>(derive: (scope: Scope) => T) => Object.fromEntries(scopes.map((s) => [s, derive(s)]))

  return (
    <ScoringView
      initialScope={parseScope((await searchParams).season, scopes, "all")}
      scopes={scopes}
      rows={byScope((s) => scoringRows(sides, s))}
      spread={byScope((s) => consistency(sides, s))}
      trend={scoringTrend(sides)}
      ranks={scoringRanks(league, sides)}
      finish={strongFinish(league, sides)}
    />
  )
}
