"use client"

import type { weeklyGrid } from "../_lib/more-stats"
import { HeatTable, Panel, fmt } from "../_components/ui"

type Grid = ReturnType<typeof weeklyGrid>

export function WeeklyGrid({ grid, highlighted }: { grid: Grid; highlighted: string | null }) {
  // Teams that played each week; a playoff round with byes has fewer
  const played = grid.weeks.map((_, i) => grid.rows.filter((r) => r.cells[i]).length)

  return (
    <Panel
      title={`Every score, ${grid.year}`}
      description="Every manager's score each week; darker is a better score that week. Tap or hover a cell for the result."
      method="Shading is the score's rank within its week, so the week's top scorer is the most colored. Double weeks (marked ×2) cover two NFL weeks and aren't ranked; — is a bye. Managers are in regular-season standings order."
    >
      <HeatTable
        corner="Manager"
        highlight={(m) => m === highlighted}
        columns={grid.weeks.map((w) => (w.double ? `${w.short} ×2` : w.short))}
        rows={grid.rows.map((row) => ({
          key: row.manager,
          label: row.manager,
          cells: row.cells.map((c, i) => {
            const week = grid.weeks[i]
            if (!c) return { text: "", t: null, title: `${row.manager}, ${week.label}: bye` }
            return {
              text: fmt(c.pf, 1),
              t: c.rank == null ? null : 1 - (c.rank - 1) / (played[i] - 1),
              title: `${row.manager}, ${week.label}: ${fmt(c.pf)} vs ${c.opponent} (${c.win ? "W" : "L"})${c.rank ? `, #${c.rank} of ${played[i]} that week` : ""}`,
            }
          }),
        }))}
      />
    </Panel>
  )
}
