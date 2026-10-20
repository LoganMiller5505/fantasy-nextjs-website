"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DataTable } from "../../data-table"
import { SortableHeader, sortFn_numeric } from "../../columns"
import { type DataTableFeatures } from "../../data-table-features"
import type { ScoringRow } from "../stats"
import { Panel, SERIES } from "../ui"

const columnHelper = createColumnHelper<DataTableFeatures, ScoringRow>()
const keys = [
  "GP", "Record", "Win%", "PF", "PA", "PPG", "PA/G", "Diff", "Reg W-L", "Playoff W-L", "Playoff apps", "Titles",
] as const
// Records like "19-19" sort as text; everything else is a number
const textKeys = new Set<string>(["Record", "Reg W-L", "Playoff W-L"])

const columns = columnHelper.columns([
  columnHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Player" />,
    enableHiding: false,
    filterFn: "excludes",
  }),
  ...keys.map((key) =>
    columnHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...(!textKeys.has(key) && { sortFn: sortFn_numeric }),
      ...(key === "Win%" && { cell: ({ getValue }) => Number(getValue()).toFixed(3) }),
      ...((key === "PF" || key === "PA" || key === "Diff") && {
        cell: ({ getValue }) => Number(getValue()).toLocaleString("en-US", { maximumFractionDigits: 2 }),
      }),
    })
  ),
])

const config = {
  ppg: { label: "Points for / game", theme: SERIES.blue },
  papg: { label: "Points against / game", theme: SERIES.orange },
} satisfies ChartConfig

export function Scoring({ rows }: { rows: ScoringRow[] }) {
  const perGame = [...rows]
    .sort((a, b) => b.PPG - a.PPG)
    .map((r) => ({ manager: r.player, ppg: r.PPG, papg: r["PA/G"] }))

  return (
    <div className="grid gap-4">
      <Panel
        title="All-time scoring"
        description="Record, PF and PA count every game, consolation games included. Playoff W-L is championship-bracket games only. PPG and PA/G skip double weeks, which cover two NFL weeks."
      >
        <DataTable columns={columns} data={rows} initialSorting={[{ id: "PPG", desc: true }]} />
      </Panel>
      <Panel title="Points for vs against, per game" description="Sorted by points for. Bars further apart = a bigger edge.">
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: perGame.length * 34 + 60 }}>
          <BarChart data={perGame} layout="vertical" barGap={2} barCategoryGap={6} margin={{ left: 8, right: 12 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="manager" tickLine={false} axisLine={false} width={72} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} verticalAlign="top" itemSorter={null} />
            <Bar dataKey="ppg" fill="var(--color-ppg)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="papg" fill="var(--color-papg)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </Panel>
    </div>
  )
}
