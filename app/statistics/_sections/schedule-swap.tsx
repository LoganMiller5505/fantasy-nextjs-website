"use client"

import type { scheduleSwap } from "../_lib/more-stats"
import { HeatTable, Panel, SimpleTable, diverging } from "../_components/ui"

type Swap = ReturnType<typeof scheduleSwap>

// `latestOnly`: the page is showing all-time, so this shows the latest season instead
export function ScheduleSwap({ swap, highlighted, latestOnly = false }: { swap: Swap; highlighted: string | null; latestOnly?: boolean }) {
  const year = swap.year
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
      <Panel
        title={`What if you had their schedule? ${year}`}
        description={`${latestOnly ? `Schedules only swap within a season, so this is ${year}; pick a season above to see another. ` : ""}Each manager's record with every other manager's schedule; blue is better than their real record, red worse.`}
        method="Each row replays a manager's regular-season scores against the opponents on each column's schedule. In a week where that schedule meant playing yourself, you play its owner instead. The outlined diagonal is the real record."
      >
        <HeatTable
          corner="Manager ↓  Schedule →"
          highlight={(m) => m === highlighted}
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
        <SimpleTable
          head={["Manager", "Best schedule", "Record", "Worst schedule", "Record"]}
          align={["left", "left", "right", "left", "right"]}
          highlight={(i) => extremes[i].manager === highlighted}
          rows={extremes.map((e) => [
            e.manager,
            e.best.schedule,
            `${e.best.wins}-${e.best.losses} (${e.best.change > 0 ? "+" : ""}${e.best.change})`,
            e.worst.schedule,
            `${e.worst.wins}-${e.worst.losses} (${e.worst.change > 0 ? "+" : ""}${e.worst.change})`,
          ])}
        />
      </Panel>
    </div>
  )
}
