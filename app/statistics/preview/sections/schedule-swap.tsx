"use client"

import * as React from "react"
import type { scheduleSwap } from "../more-stats"
import { Controls, HeatTable, Panel, Picker, diverging } from "../ui"

type Swap = ReturnType<typeof scheduleSwap>

export function ScheduleSwap({ bySeason }: { bySeason: Record<number, Swap> }) {
  const years = Object.keys(bySeason).map(Number).sort((a, b) => b - a)
  const [year, setYear] = React.useState(years[0])
  const swap = bySeason[year]
  const limit = Math.max(...swap.rows.flatMap((r) => r.cells.map((c) => Math.abs(c.change))))
  // The schedule that would have helped (and hurt) each manager most
  const extremes = swap.rows.map((r) => {
    const others = r.cells.filter((c) => c.schedule !== r.manager)
    return {
      manager: r.manager,
      best: others.reduce((a, b) => (b.change > a.change ? b : a)),
      worst: others.reduce((a, b) => (b.change < a.change ? b : a)),
    }
  })

  return (
    <div className="grid gap-4">
      <Controls>
        <Picker label="Season" value={year} options={years} onChange={setYear} />
      </Controls>
      <Panel
        title={`What if you had their schedule? ${year}`}
        description="Each row is a manager's regular-season scores replayed against the opponents in each column's schedule; in a week that schedule meant playing yourself, you play its owner instead. The outlined diagonal is the real record. Blue is better than real, red worse."
      >
        <HeatTable
          corner="Manager ↓  Schedule →"
          columns={swap.managers}
          rows={swap.rows.map((row) => ({
            key: row.manager,
            label: row.manager,
            cells: row.cells.map((c) => ({
              text: `${c.wins}-${c.losses}`,
              ...(c.schedule === row.manager ? { t: null, outlined: true } : diverging(c.change, limit)),
              title:
                c.schedule === row.manager
                  ? `${row.manager}'s real record`
                  : `${row.manager} with ${c.schedule}'s schedule: ${c.wins}-${c.losses} (${c.change > 0 ? "+" : ""}${c.change} wins)`,
            })),
          }))}
        />
      </Panel>
      <Panel title="Best and worst schedules to have had" description="For each manager, the other schedules that would have changed their record the most.">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b">
                <th className="px-2 py-2 font-medium">Manager</th>
                <th className="px-2 py-2 font-medium">Best schedule</th>
                <th className="px-2 py-2 text-right font-medium">Record</th>
                <th className="px-2 py-2 font-medium">Worst schedule</th>
                <th className="px-2 py-2 text-right font-medium">Record</th>
              </tr>
            </thead>
            <tbody>
              {extremes.map((e) => (
                <tr key={e.manager} className="even:bg-muted/30 border-b last:border-0">
                  <td className="px-2 py-2">{e.manager}</td>
                  <td className="px-2 py-2">{e.best.schedule}</td>
                  <td className="px-2 py-2 text-right">
                    {e.best.wins}-{e.best.losses} ({e.best.change > 0 ? "+" : ""}{e.best.change})
                  </td>
                  <td className="px-2 py-2">{e.worst.schedule}</td>
                  <td className="px-2 py-2 text-right">
                    {e.worst.wins}-{e.worst.losses} ({e.worst.change > 0 ? "+" : ""}{e.worst.change})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
