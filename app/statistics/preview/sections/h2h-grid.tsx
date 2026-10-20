"use client"

import type { h2hGrid } from "../more-stats"
import { HeatTable, Panel, diverging } from "../ui"
import { usePreview } from "./preview-tabs"

type Grid = ReturnType<typeof h2hGrid>

export function H2HGrid({ grid }: { grid: Grid }) {
  const { openRivalry } = usePreview()

  return (
    <Panel
      title="Head-to-head, everyone"
      description="Each row manager's all-time record against each column manager, playoffs and consolation games included. Blue is a winning record, red a losing one; an empty cell means they've never played. Click a cell to open that rivalry."
    >
      <HeatTable
        corner="Manager ↓  vs →"
        columns={grid.managers}
        rows={grid.rows.map((row) => ({
          key: row.manager,
          label: row.manager,
          cells: row.cells.map((c) =>
            c.opponent === row.manager || c.pct == null
              ? { text: "", t: null }
              : {
                  text: `${c.wins}-${c.losses}`,
                  ...diverging(c.pct - 0.5, 0.5),
                  title: `${row.manager} vs ${c.opponent}: ${c.wins}-${c.losses}. Click to open the rivalry.`,
                  onClick: () => openRivalry(row.manager, c.opponent),
                }
          ),
        }))}
      />
    </Panel>
  )
}
