"use client"

import { emphasis } from "../_components/highlight"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import { ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { scopeLabel } from "../_components/scope"
import { SortableHeader, numeric } from "../_components/table-helpers"
import { Chart, Legend, ManagerLink, Panel, SERIES, fmt } from "../_components/ui"
import type { ConsistencyRow } from "../_lib/more-stats"
import { FEW_GAMES, type Scope } from "../_lib/stats"

const columnHelper = createColumnHelper<DataTableFeatures, ConsistencyRow>()
const keys = ["GP", "Mean", "SD", "Floor", "Median", "Ceiling", "Low", "High", "Above median"] as const

const columns = columnHelper.columns([
  columnHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Manager" />,
    enableHiding: false,
    filterFn: "excludes",
    cell: ({ getValue }) => <ManagerLink manager={String(getValue())} />,
  }),
  ...keys.map((key) =>
    columnHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...(key !== "Above median" && numeric),
      // Every figure but games played to one decimal place, so the columns line up
      ...(key !== "Above median" && key !== "GP" && { cell: ({ getValue }) => fmt(Number(getValue()), 1) }),
    })
  ),
])

const config = { iqr: { label: "Middle 50% of weeks", theme: SERIES.blue } } satisfies ChartConfig

// One bar per manager spanning lowest to highest week, drawn as the three marks of the strip: a
// thin line for the full range, a bar for the middle half and a tick at the median. Positions
// inside the bar are interpolated from its ends, so everything shares one axis.
function Strip({
  x,
  y,
  width,
  height,
  payload,
  highlighted,
}: {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: ConsistencyRow & { few: boolean }
  highlighted: string | null
}) {
  if (x == null || y == null || width == null || height == null || !payload) return null
  const at = (v: number) => x + ((v - payload.Low) / (payload.High - payload.Low || 1)) * width
  const mid = y + height / 2
  return (
    <g>
      <rect x={x} y={mid - 1} width={width} height={2} fill="var(--muted-foreground)" fillOpacity={0.35} />
      <rect x={at(payload.p25)} y={mid - 7} width={at(payload.p75) - at(payload.p25)} height={14} rx={4} fill="var(--color-iqr)" fillOpacity={payload.few ? 0.3 : emphasis(payload.player, highlighted)} />
      <rect x={at(payload.Median) - 1.5} y={mid - 9} width={3} height={18} fill="var(--foreground)" />
    </g>
  )
}

export function Consistency({ rows, scope, highlighted }: { rows: ConsistencyRow[]; scope: Scope; highlighted: string | null }) {
  // All-time, managers with only a few games are faded and listed last
  const few = (r: ConsistencyRow) => scope === "all" && r.GP < FEW_GAMES
  const chart = [...rows.filter((r) => !few(r)), ...rows.filter(few)].map((r) => ({ ...r, few: few(r), range: [r.Low, r.High] }))
  const lo = Math.floor(Math.min(...rows.map((r) => r.Low)) / 10) * 10
  const hi = Math.ceil(Math.max(...rows.map((r) => r.High)) / 10) * 10

  return (
    <div className="grid gap-4">
      <Panel
        title={`Steady or boom-or-bust · ${scopeLabel(scope)}`}
        description={`How much each manager's weekly scores swing. Most consistent at the top.${scope === "all" ? ` Managers with fewer than ${FEW_GAMES} games are faded and listed last.` : ""}`}
        method="The thin line runs from a manager's lowest week to their highest, the bar covers the middle half of their weeks, and the tick is the median. Ordered by standard deviation. Double weeks are left out."
      >
        <Chart config={config} className="aspect-auto w-full" style={{ height: rows.length * 30 + 40 }}>
          <BarChart data={chart} layout="vertical" barCategoryGap={6} margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[lo, hi]} tickLine={false} axisLine={false} allowDataOverflow />
            <YAxis type="category" dataKey="player" tickLine={false} axisLine={false} width={72} />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                const r = payload?.[0]?.payload as ConsistencyRow | undefined
                if (!active || !r) return null
                return (
                  <div className="bg-background grid gap-1 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                    <div className="font-medium">{r.player}</div>
                    {[
                      ["Highest", r.High],
                      ["Ceiling (90th pct)", r.Ceiling],
                      ["Median", r.Median],
                      ["Floor (10th pct)", r.Floor],
                      ["Lowest", r.Low],
                      ["Standard deviation", r.SD],
                    ].map(([label, v]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium tabular-nums">{fmt(Number(v), 1)}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            <Bar dataKey="range" shape={(props: object) => <Strip {...props} highlighted={highlighted} />} isAnimationActive={false} />
          </BarChart>
        </Chart>
        <Legend items={[{ label: "Middle 50% of weeks", color: SERIES.blue }, { label: "Lowest to highest week", color: "muted" }]} note="The dark tick is the median." />
      </Panel>
      <Panel
        title="Score spread"
        description="The numbers behind the chart above; lower SD is steadier."
        method="SD is the standard deviation of weekly scores. Floor and ceiling are the 10th and 90th percentile weeks. Above median counts weeks above the league's median that week. Low and High start hidden (the chart shows them); add them back with Columns."
      >
        <DataTable
          columns={columns}
          data={rows}
          initialSorting={[{ id: "SD", desc: false }]}
          initialColumnVisibility={{ Low: false, High: false }}
          phoneHidden={["Mean", "Floor", "Ceiling", "Above median"]}
          highlight={(r) => r.player === highlighted}
          muted={few}
        />
      </Panel>
    </div>
  )
}
