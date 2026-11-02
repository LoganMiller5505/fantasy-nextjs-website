import { getEspnData, getStats } from "../_lib/data"
import {
  activity,
  benchBlunders,
  bestPickups,
  draft,
  lineupEfficiency,
  pointSources,
  positionScoring,
  preseasonVsFinish,
  previewBase,
  projectedUpsets,
  projectionRows,
  teamMvps,
  tradeLedger,
} from "../_lib/preview"
import { parseScope } from "../_lib/scope"
import type { Scope } from "../_lib/stats"
import { PreviewView } from "../_sections/preview"

// Stats built from the ESPN feed, before they find homes on the other pages. Reached by URL only.
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ season?: string | string[] }> }) {
  const [{ sides, seasons, current }, espn] = await Promise.all([getStats(), getEspnData()])
  const base = previewBase(espn, sides)
  const scopes: Scope[] = ["all", ...seasons]
  const byScope = <T,>(derive: (scope: Scope) => T) => Object.fromEntries(scopes.map((s) => [s, derive(s)]))
  const bySeason = <T,>(derive: (year: number) => T) => Object.fromEntries(seasons.map((y) => [y, derive(y)]))

  return (
    <PreviewView
      initialScope={parseScope((await searchParams).season, scopes, current)}
      scopes={scopes}
      lineups={byScope((s) => ({
        efficiency: lineupEfficiency(base, s),
        blunders: benchBlunders(base, s),
        positions: positionScoring(base, s),
        mvps: teamMvps(base, s),
      }))}
      projections={byScope((s) => ({ rows: projectionRows(base, s), ...projectedUpsets(base, s) }))}
      drafts={bySeason((y) => ({ ...draft(espn, base, y), preseason: preseasonVsFinish(espn, sides, y) }))}
      moves={byScope((s) => ({
        sources: pointSources(base, s),
        pickups: bestPickups(base, s),
        trades: tradeLedger(espn, base, s),
        activity: activity(espn, base, s),
      }))}
    />
  )
}
