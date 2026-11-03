"use client"

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { emphasis } from "../_components/highlight"
import { scopeLabel } from "../_components/scope"
import { SortableHeader, numeric } from "../_components/table-helpers"
import { Chart, Legend, ManagerLink, Panel, SERIES, Section, SimpleTable, fmt } from "../_components/ui"
import type { Origin } from "../_lib/espn/base"
import type { ActivityRow, TradeRow, pointSources } from "../_lib/espn/moves"
import type { Scope } from "../_lib/stats"

export type MovesData = { sources: ReturnType<typeof pointSources>; trades: TradeRow[]; activity: ActivityRow[] }

const ORIGINS: Origin[] = ["Draft", "Trade", "Pickup"]

const config = {
  Draft: { label: "Drafted", theme: SERIES.blue },
  Trade: { label: "Traded for", theme: SERIES.aqua },
  Pickup: { label: "Picked up", theme: SERIES.orange },
} satisfies ChartConfig

const columnHelper = createColumnHelper<DataTableFeatures, ActivityRow>()
const keys = ["Adds", "Drops", "Trades", "Lineup moves", "Pickup pts", "Pickup %"] as const

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
      ...numeric,
      ...(key === "Pickup pts" && { cell: ({ getValue }) => fmt(Number(getValue()), 1) }),
      ...(key === "Pickup %" && { cell: ({ getValue }) => `${fmt(Number(getValue()), 1)}%` }),
    })
  ),
])

export function MovesSection({ data, scope, highlighted }: { data: MovesData; scope: Scope; highlighted: string | null }) {
  const { sources, trades, activity } = data
  const season = (year: number) => (scope === "all" ? `${year} ` : "")
  // One row per side of each trade, with the date on its first
  const ledger = trades.flatMap((trade) => trade.sides.map((side, i) => ({ trade, side, first: i === 0 })))

  return (
    <Section title="Roster moves" description="How each roster was built after the draft: pickups, trades and lineup churn.">
      <Panel
        title={`Where the points came from · ${scopeLabel(scope)}`}
        description="The share of each manager's starter points scored by players they drafted, traded for, and picked up. Most drafted first."
        method="Drafted: taken by that manager in that season's draft, even if dropped and picked up again later. Traded for: received in a trade. Picked up: everyone else, from waivers or free agency. Regular season only."
      >
        <Chart config={config} className="aspect-auto w-full" style={{ height: sources.length * 30 + 40 }}>
          <BarChart data={sources} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="manager" tickLine={false} axisLine={false} width={72} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v, name) => `${config[name as Origin].label}: ${fmt(Number(v), 1)}%`} />} />
            {ORIGINS.map((o, i) => (
              <Bar key={o} dataKey={o} stackId="share" radius={i === ORIGINS.length - 1 ? [0, 4, 4, 0] : 0}>
                {sources.map((r) => (
                  <Cell key={r.manager} fill={`var(--color-${o})`} fillOpacity={emphasis(r.manager, highlighted)} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </Chart>
        <Legend items={ORIGINS.map((o) => ({ label: config[o].label, color: config[o].theme }))} />
      </Panel>
      <Panel
        title="Trade ledger"
        description="What each side got, and what it scored for them for the rest of the season."
        method="Used counts weeks after the trade in which the player started for the manager who received him; Got counts every week he was on that roster, started or not. Playoffs included. The side whose new players scored more in its lineup is marked ✓."
      >
        {trades.length ? (
          <SimpleTable
            head={["When", "Manager", "Received", "Used", "Got"]}
            align={["left", "left", "left", "right", "right"]}
            highlight={(i) => ledger[i].side.manager === highlighted}
            rows={ledger.map(({ trade, side, first }) => [
              first ? `${season(trade.year)}${trade.week}` : "",
              `${side.manager}${trade.winner === side.manager ? " ✓" : ""}`,
              side.received.map((r) => `${r.name} (${fmt(r.points, 1)})`).join(", "),
              fmt(side.points, 1),
              fmt(side.got, 1),
            ])}
          />
        ) : (
          <p className="text-muted-foreground text-sm">No trades in this span.</p>
        )}
      </Panel>
      <Panel
        title="Transaction activity"
        description="Adds, drops, trades and lineup moves, with the points those adds put in each lineup."
        method="Counts are ESPN's own team totals for the season, playoffs included. Pickup pts and Pickup % count regular-season starts only."
      >
        <DataTable columns={columns} data={activity} initialSorting={[{ id: "Adds", desc: true }]} highlight={(r) => r.player === highlighted} phoneHidden={["Drops", "Lineup moves"]} />
      </Panel>
    </Section>
  )
}
