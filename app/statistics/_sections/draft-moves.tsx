"use client"

import { HighlightPicker, useHighlight } from "../_components/highlight"
import { ScopeToggle, Toolbar, useScope } from "../_components/scope"
import type { DraftTabData } from "../_lib/espn/additions"
import type { Scope } from "../_lib/stats"
import { DraftMovesSections } from "./additions/draft-moves"

// How each roster was built: the draft, the moves since, then the best and worst of both
export function DraftMovesView({ initialScope, scopes, data }: { initialScope: Scope; scopes: Scope[]; data: DraftTabData }) {
  const [scope, setScope] = useScope(initialScope)
  const managers = data.moves[String(scope)].activity.map((r) => r.player)
  const [highlighted, setHighlighted] = useHighlight(managers)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <ScopeToggle value={scope} options={scopes} onChange={setScope} />
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} end />
      </Toolbar>
      <DraftMovesSections data={data} scope={scope} highlighted={highlighted} />
    </div>
  )
}
