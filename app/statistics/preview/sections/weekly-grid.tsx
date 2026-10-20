"use client"

import * as React from "react"
import type { weeklyGrid } from "../more-stats"
import { Controls, HeatTable, Panel, Picker, fmt } from "../ui"

type Grid = ReturnType<typeof weeklyGrid>

export function WeeklyGrid({ bySeason }: { bySeason: Record<number, Grid> }) {
  const years = Object.keys(bySeason).map(Number).sort((a, b) => b - a)
  const [year, setYear] = React.useState(years[0])
  const grid = bySeason[year]
  // Teams that played each week; a playoff round with byes has fewer
  const played = grid.weeks.map((_, i) => grid.rows.filter((r) => r.cells[i]).length)

  return (
    <div className="grid gap-4">
      <Controls>
        <Picker label="Season" value={year} options={years} onChange={setYear} />
      </Controls>
      <Panel
        title={`Every score, ${year}`}
        description="Darker means a better score relative to that week: the week's top scorer is darkest. Double weeks (marked ×2) aren't ranked, and – is a bye. Managers are in regular-season order; hover a cell for the result."
      >
        <HeatTable
          corner="Manager"
          columns={grid.weeks.map((w) => (w.double ? `${w.short} ×2` : w.short))}
          rows={grid.rows.map((row) => ({
            key: row.manager,
            label: row.manager,
            cells: row.cells.map((c, i) => {
              const week = grid.weeks[i]
              if (!c) return { text: "–", t: null, title: `${week.label}: bye` }
              return {
                text: fmt(c.pf, 1),
                t: c.rank == null ? null : 1 - (c.rank - 1) / (played[i] - 1),
                title: `${week.label}: ${fmt(c.pf)} vs ${c.opponent} (${c.win ? "W" : "L"})${c.rank ? `, #${c.rank} of ${played[i]} that week` : ""}`,
              }
            }),
          }))}
        />
      </Panel>
    </div>
  )
}
