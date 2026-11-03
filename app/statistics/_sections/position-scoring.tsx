"use client"

import { HeatTable, Panel, SimpleTable, diverging, fmt } from "../_components/ui"
import type { positionScoring, teamMvps } from "../_lib/espn/scoring"

export type PositionData = { positions: ReturnType<typeof positionScoring>; mvps: ReturnType<typeof teamMvps> }

const percent = (x: number) => `${(100 * x).toFixed(1)}%`
const mvp = (p: { name: string; points: number } | undefined) => (p ? `${p.name} (${fmt(p.points, 1)})` : "")

// Where each lineup's points come from: by slot, and by player
export function PositionScoring({ data, highlighted }: { data: PositionData; highlighted: string | null }) {
  const { positions, mvps } = data
  // Each column's full colour is its biggest gap from the league average
  const limits = positions.columns.map((_, i) => Math.max(...positions.rows.map((r) => Math.abs(r.values[i] - positions.average[i]))))

  return (
    <>
      <Panel
        title="Points by position"
        description="Starters' points per week from each slot. Blue is above the league average for that slot, red below."
        method="From ESPN's weekly lineups: the points each starting slot scored, averaged over the regular-season weeks ESPN has closed."
      >
        <HeatTable
          corner="Manager"
          columns={positions.columns}
          highlight={(m) => m === highlighted}
          rows={positions.rows.map((r) => ({
            key: r.manager,
            label: r.manager,
            cells: r.values.map((v, i) => ({
              text: fmt(v, 1),
              ...diverging(v - positions.average[i], limits[i]),
              title: `${r.manager}'s ${positions.columns[i]}: ${fmt(v, 1)} a week (league average ${fmt(positions.average[i], 1)})`,
            })),
          }))}
        />
      </Panel>
      <Panel
        title="Team MVPs"
        description="Each manager's top three players by points in their lineup. Most reliant on one player first."
        method="Points count only regular-season weeks the player started for that manager. Share is the top player's part of all the team's starter points."
      >
        <SimpleTable
          head={["Manager", "MVP", "Share", "2nd", "3rd"]}
          align={["left", "left", "right", "left", "left"]}
          highlight={(i) => mvps[i].manager === highlighted}
          rows={mvps.map((m) => [m.manager, mvp(m.players[0]), percent(m.share), mvp(m.players[1]), mvp(m.players[2])])}
        />
      </Panel>
    </>
  )
}
