"use client"

import type { playoffRisers } from "../_lib/stats"
import { Panel, SERIES, SimpleTable, fmt } from "../_components/ui"

// A small bar either side of a centre line: right in blue for a rise, left in red for a drop,
// scaled to the biggest change in the table
function DeltaBar({ value, limit }: { value: number; limit: number }) {
  const width = `${(Math.min(Math.abs(value) / (limit || 1), 1) * 50).toFixed(1)}%`
  const color = value >= 0 ? SERIES.blue : SERIES.red
  return (
    <span aria-hidden className="bg-muted/60 relative inline-block h-2 w-16 rounded-full align-middle">
      <span className="bg-border absolute inset-y-0 left-1/2 w-px" />
      <span
        className="absolute inset-y-0 rounded-full bg-(--bar) dark:bg-(--bar-dark)"
        style={{
          width,
          ...(value >= 0 ? { left: "50%" } : { right: "50%" }),
          ...({ "--bar": color.light, "--bar-dark": color.dark } as React.CSSProperties),
        }}
      />
    </span>
  )
}

export function PlayoffRisers({ risers, highlighted }: { risers: ReturnType<typeof playoffRisers>; highlighted: string | null }) {
  const limit = Math.max(...risers.map((r) => Math.abs(r.change)))
  return (
    <Panel
      title="Who rises in the playoffs"
      description="Points per game in the regular season against playoff weeks. Biggest risers first."
      method="Playoff weeks include consolation games. Double-week points are halved so every week counts once. Weeks is the number of playoff weeks played."
    >
      <SimpleTable
        head={["Manager", "Regular", "Playoffs", "Change", "Weeks"]}
        align={["left", "right", "right", "right", "right"]}
        highlight={(i) => risers[i].manager === highlighted}
        rows={risers.map((r) => [
          r.manager,
          fmt(r.regular, 1),
          fmt(r.playoffs, 1),
          <span key="change" className="inline-flex items-center justify-end gap-2">
            <DeltaBar value={r.change} limit={limit} />
            <span className="w-12">{`${r.change > 0 ? "+" : ""}${fmt(r.change, 1)}`}</span>
          </span>,
          r.weeks,
        ])}
      />
    </Panel>
  )
}
