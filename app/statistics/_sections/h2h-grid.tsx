"use client"

import type { h2hGrid } from "../_lib/more-stats"
import { HeatTable, Panel, diverging } from "../_components/ui"

type Grid = ReturnType<typeof h2hGrid>

// A record over a few meetings says little, so its colour is held back: full strength needs
// FULL_STRENGTH meetings, and fewer scale it down (a 1-0 shows a third as strong as a 3-0)
const FULL_STRENGTH = 3

export function H2HGrid({
  grid,
  openRivalry,
  highlighted,
}: {
  grid: Grid
  openRivalry: (a: string, b: string) => void
  highlighted: string | null
}) {
  return (
    <Panel
      title="Head-to-head, everyone"
      description="Each row manager's all-time record against each column manager. Blue is a winning record, red a losing one; the colour is fainter when they've met fewer than 3 times. Tap a cell to open that rivalry."
      method="Every meeting counts, playoffs and consolation games included. — means the two have never played."
    >
      <HeatTable
        corner="Manager ↓  vs →"
        highlight={(m) => m === highlighted}
        columns={grid.managers}
        rows={grid.rows.map((row) => ({
          key: row.manager,
          label: row.manager,
          cells: row.cells.map((c) =>
            c.opponent === row.manager
              ? { text: "", t: null, title: `${row.manager} (no games against themselves)` }
              : c.pct == null
              ? { text: "", t: null, title: `${row.manager} and ${c.opponent} have never played` }
              : {
                  text: `${c.wins}-${c.losses}`,
                  ...diverging((c.pct - 0.5) * Math.min(1, (c.wins + c.losses) / FULL_STRENGTH), 0.5),
                  title: `${row.manager} vs ${c.opponent}, ${c.wins}-${c.losses}. Opens the rivalry.`,
                  onClick: () => openRivalry(row.manager, c.opponent),
                }
          ),
        }))}
      />
    </Panel>
  )
}
