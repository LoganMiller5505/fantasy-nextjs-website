"use client"

import { HighlightPicker, useHighlight } from "../_components/highlight"
import { ScopeToggle, Toolbar, useScope } from "../_components/scope"
import type { LineupsTabData } from "../_lib/espn/additions"
import type { Scope } from "../_lib/stats"
import { LineupsSections } from "./additions/lineups"

export function LineupsView({ initialScope, scopes, bySeason }: { initialScope: Scope; scopes: Scope[]; bySeason: Record<string, LineupsTabData> }) {
  const [scope, setScope] = useScope(initialScope)
  const data = bySeason[String(scope)]
  const managers = data.efficiency.map((r) => r.player)
  const [highlighted, setHighlighted] = useHighlight(managers)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <ScopeToggle value={scope} options={scopes} onChange={setScope} />
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} end />
      </Toolbar>
      <LineupsSections data={data} scope={scope} highlighted={highlighted} />
    </div>
  )
}
