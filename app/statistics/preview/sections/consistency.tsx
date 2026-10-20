"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "../../data-table"
import { SortableHeader, sortFn_numeric } from "../../columns"
import { type DataTableFeatures } from "../../data-table-features"
import type { ConsistencyRow } from "../more-stats"
import { Controls, Legend, Panel, Picker, SERIES, fmt } from "../ui"

const columnHelper = createColumnHelper<DataTableFeatures, ConsistencyRow>()
const keys = ["GP", "Mean", "SD", "Floor", "Median", "Ceiling", "Low", "High", "Above median"] as const

const columns = columnHelper.columns([
  columnHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Player" />,
    enableHiding: false,
    filterFn: "excludes",
  }),
  ...keys.map((key) =>
    columnHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...(key !== "Above median" && { sortFn: sortFn_numeric }),
    })
  ),
])

const config = { iqr: { label: "Middle 50% of weeks", theme: SERIES.blue } } satisfies ChartConfig

type Scope = number | "all"

// One bar per manager spanning lowest to highest week, drawn as the three marks of the strip: a
// thin line for the full range, a bar for the middle half and a tick at the median. Positions
// inside the bar are interpolated from its ends, so everything shares one axis.
function Strip({ x, y, width, height, payload }: { x?: number; y?: number; width?: number; height?: number; payload?: ConsistencyRow }) {
  if (x == null || y == null || width == null || height == null || !payload) return null
  const at = (v: number) => x + ((v - payload.Low) / (payload.High - payload.Low || 1)) * width
  const mid = y + height / 2
  return (
    <g>
      <rect x={x} y={mid - 1} width={width} height={2} fill="var(--muted-foreground)" fillOpacity={0.35} />
      <rect x={at(payload.p25)} y={mid - 7} width={at(payload.p75) - at(payload.p25)} height={14} rx={4} fill="var(--color-iqr)" />
      <rect x={at(payload.Median) - 1.5} y={mid - 9} width={3} height={18} fill="var(--foreground)" />
    </g>
  )
}

export function Consistency({ bySeason }: { bySeason: Record<string, ConsistencyRow[]> }) {
  const scopes: Scope[] = ["all", ...Object.keys(bySeason).filter((k) => k !== "all").map(Number).sort((a, b) => b - a)]
  const [scope, setScope] = React.useState<Scope>("all")
  const rows = bySeason[String(scope)]
  const chart = rows.map((r) => ({ ...r, range: [r.Low, r.High] }))
  const lo = Math.floor(Math.min(...rows.map((r) => r.Low)) / 10) * 10
  const hi = Math.ceil(Math.max(...rows.map((r) => r.High)) / 10) * 10

  return (
    <div className="grid gap-4">
      <Controls>
        <Picker
          label="Season"
          value={scope}
          options={scopes}
          onChange={setScope}
          format={(s) => (s === "all" ? "All-time" : String(s))}
        />
      </Controls>
      <Panel
        title="Steady or boom-or-bust"
        description="Each manager's weekly scores: the thin line runs from their lowest to their highest week, the bar covers the middle half, and the tick is the median. Most consistent at the top. Double weeks are left out."
      >
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * 30 + 40 }}>
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
            <Bar dataKey="range" shape={(props: object) => <Strip {...props} />} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        <Legend items={[{ label: "Middle 50% of weeks", color: SERIES.blue }, { label: "Lowest to highest week", color: "muted" }]} note="The dark tick is the median." />
      </Panel>
      <Panel
        title="Score spread"
        description="SD is the standard deviation of weekly scores; lower is steadier. Floor and ceiling are the 10th and 90th percentile weeks. Above median counts weeks above the league's median that week."
      >
        <DataTable columns={columns} data={rows} initialSorting={[{ id: "SD", desc: false }]} />
      </Panel>
    </div>
  )
}
