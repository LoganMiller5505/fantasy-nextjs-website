"use client"

import type {
  activity,
  benchBlunders,
  bestPickups,
  draft,
  lineupEfficiency,
  pointSources,
  positionScoring,
  preseasonVsFinish,
  projectedUpsets,
  projectionRows,
  teamMvps,
  tradeLedger,
} from "../_lib/preview"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { ScopeToggle, Toolbar, useScope } from "../_components/scope"
import type { Scope } from "../_lib/stats"
import { DraftSection } from "./preview-draft"
import { LineupsSection } from "./preview-lineups"
import { MovesSection } from "./preview-moves"
import { ProjectionsSection } from "./preview-projections"

export type LineupData = {
  efficiency: ReturnType<typeof lineupEfficiency>
  blunders: ReturnType<typeof benchBlunders>
  positions: ReturnType<typeof positionScoring>
  mvps: ReturnType<typeof teamMvps>
}
export type ProjectionData = { rows: ReturnType<typeof projectionRows> } & ReturnType<typeof projectedUpsets>
export type DraftData = ReturnType<typeof draft> & { preseason: ReturnType<typeof preseasonVsFinish> }
export type MovesData = {
  sources: ReturnType<typeof pointSources>
  pickups: ReturnType<typeof bestPickups>
  trades: ReturnType<typeof tradeLedger>
  activity: ReturnType<typeof activity>
}

// Lineup calls first (the freshest talking point each week), then how the projections fared, then
// how the rosters were built: the draft, and the moves since
export function PreviewView({
  initialScope,
  scopes,
  lineups,
  projections,
  drafts,
  moves,
}: {
  initialScope: Scope
  scopes: Scope[]
  lineups: Record<string, LineupData>
  projections: Record<string, ProjectionData>
  drafts: Record<number, DraftData>
  moves: Record<string, MovesData>
}) {
  const [scope, setScope] = useScope(initialScope)
  const key = String(scope)
  const managers = lineups[key].efficiency.map((r) => r.player)
  const [highlighted, setHighlighted] = useHighlight(managers)
  // A draft is one season's: all-time shows the latest one
  const draftYear = scope === "all" ? Math.max(...Object.keys(drafts).map(Number)) : scope

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <ScopeToggle value={scope} options={scopes} onChange={setScope} />
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} end />
      </Toolbar>
      <p className="text-muted-foreground max-w-prose text-sm">
        Preview: these stats come from ESPN&apos;s own data (rosters, lineups, projections, the draft and transactions), which the
        rest of the statistics pages don&apos;t have. They count regular-season weeks ESPN has closed, and may move to their own
        pages later.
      </p>
      <LineupsSection data={lineups[key]} scope={scope} highlighted={highlighted} />
      <ProjectionsSection data={projections[key]} scope={scope} highlighted={highlighted} />
      <DraftSection data={drafts[draftYear]} latestOnly={scope === "all"} highlighted={highlighted} />
      <MovesSection data={moves[key]} scope={scope} highlighted={highlighted} />
    </div>
  )
}
