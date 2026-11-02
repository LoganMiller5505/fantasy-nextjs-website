"use client"

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { emphasis } from "../_components/highlight"
import { scopeLabel } from "../_components/scope"
import { SortableHeader, numeric } from "../_components/table-helpers"
import { Chart, HeatTable, ManagerLink, Panel, SERIES, Section, SimpleTable, StatTile, TileGrid, diverging, fmt } from "../_components/ui"
import type { LineupRow } from "../_lib/preview"
import { sum, type Scope } from "../_lib/stats"
import type { LineupData } from "./preview"

const percent = (x: number) => `${(100 * x).toFixed(1)}%`
// A week, with its season when the page spans several
export const when = (scope: Scope, year: number, short: string) => (scope === "all" ? `${year} ${short}` : short)

const columnHelper = createColumnHelper<DataTableFeatures, LineupRow>()
const keys = ["Weeks", "Started", "Optimal", "Efficiency", "Left/wk", "Bench/wk", "Perfect", "Lineup L"] as const

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
      ...(key === "Efficiency" && { cell: ({ getValue }) => percent(Number(getValue())) }),
      ...((key === "Started" || key === "Optimal") && { cell: ({ getValue }) => fmt(Number(getValue()), 1) }),
    })
  ),
])

const config = { left: { label: "Left on the bench per week", theme: SERIES.blue } } satisfies ChartConfig
const mvp = (p: { name: string; points: number } | undefined) => (p ? `${p.name} (${fmt(p.points, 1)})` : "")

export function LineupsSection({ data, scope, highlighted }: { data: LineupData; scope: Scope; highlighted: string | null }) {
  const { efficiency, blunders, positions, mvps } = data
  const chart = [...efficiency].sort((a, b) => b["Left/wk"] - a["Left/wk"])
  const best = efficiency[0]
  const lineupLosses = sum(efficiency.map((r) => r["Lineup L"]))
  const mostLost = [...efficiency].sort((a, b) => b["Lineup L"] - a["Lineup L"])[0]
  // Each column's full colour is its biggest gap from the league average
  const limits = positions.columns.map((_, i) => Math.max(...positions.rows.map((r) => Math.abs(r.values[i] - positions.average[i]))))

  return (
    <Section title="Lineups" description="How close each manager came to starting their best possible lineup, and where their points come from.">
      <TileGrid>
        <StatTile
          label="League lineup efficiency"
          value={percent(sum(efficiency.map((r) => r.Started)) / (sum(efficiency.map((r) => r.Optimal)) || 1))}
          detail="Of the points the best possible lineups would have scored"
        />
        <StatTile label="Best lineup setter" value={best.player} detail={`${percent(best.Efficiency)} efficient, ${best.Perfect} perfect weeks`} />
        <StatTile label="Most left on the bench" value={chart[0].player} detail={`${fmt(chart[0]["Left/wk"], 1)} points a week below their best lineup`} />
        <StatTile
          label="Losses to lineup calls"
          value={lineupLosses}
          detail={mostLost["Lineup L"] ? `Most: ${mostLost.player} (${mostLost["Lineup L"]})` : "None yet"}
        />
      </TileGrid>
      <Panel
        title={`Points left on the bench · ${scopeLabel(scope)}`}
        description="How far each manager's lineup fell short of their best possible one, per week."
        method="The best lineup fills each slot (QB, 2 RB, 2 WR, TE, D/ST, K) with the highest scorers on the roster that week, then FLEX with the best RB, WR or TE left. Players on IR can't start. In a two-week matchup each week's lineup counts. Regular season only."
      >
        <Chart config={config} className="aspect-auto w-full" style={{ height: chart.length * 30 + 40 }}>
          <BarChart data={chart} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="player" tickLine={false} axisLine={false} width={72} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(v) => `${fmt(Number(v), 1)} points a week`} />} />
            <Bar dataKey="Left/wk" name="left" radius={4}>
              {chart.map((r) => (
                <Cell key={r.player} fill="var(--color-left)" fillOpacity={emphasis(r.player, highlighted)} />
              ))}
            </Bar>
          </BarChart>
        </Chart>
      </Panel>
      <Panel
        title="Lineup efficiency"
        description="Points started against the best lineup each roster allowed."
        method="Efficiency is points started over the best lineup's points. Perfect: weeks the lineup was already the best one. Lineup L: losses the best lineup would have won, against the opponent's actual score. Bench/wk counts everyone on the bench, whether or not they'd have started."
      >
        <DataTable
          columns={columns}
          data={efficiency}
          initialSorting={[{ id: "Efficiency", desc: true }]}
          highlight={(r) => r.player === highlighted}
          phoneHidden={["Started", "Optimal", "Bench/wk"]}
        />
      </Panel>
      <Panel
        title="Costliest bench calls"
        description="The biggest gaps between a benched player and a starter he could have replaced."
        method="For each week, the one swap of a bench player into a starting slot he was eligible for (his position, or FLEX for an RB, WR or TE) that would have added the most points."
      >
        {blunders.length ? (
          <SimpleTable
            head={["Week", "Manager", "Benched", "Started", "Cost", "Lost the game?"]}
            align={["left", "left", "left", "left", "right", "left"]}
            highlight={(i) => blunders[i].manager === highlighted}
            rows={blunders.map((b) => [
              when(scope, b.year, b.short),
              b.manager,
              `${b.benched.name} (${fmt(b.benched.points, 1)})`,
              `${b.started.name} (${fmt(b.started.points, 1)})`,
              fmt(b.gain, 1),
              b.flipped ? `Yes, to ${b.opponent}` : "",
            ])}
          />
        ) : (
          <p className="text-muted-foreground text-sm">No closed weeks yet.</p>
        )}
      </Panel>
      <Panel
        title="Points by position"
        description="Starters' points per week from each slot. Blue is above the league average for that slot, red below."
      >
        <HeatTable
          corner="Manager"
          columns={positions.columns}
          highlight={(m) => m === highlighted}
          rows={positions.rows.map((r) => ({
            key: r.manager,
            label: r.manager,
            cells: r.values.map((v, i) => ({
              text: fmt(v, 1),
              ...diverging(v - positions.average[i], limits[i]),
              title: `${r.manager}'s ${positions.columns[i]}: ${fmt(v, 1)} a week (league average ${fmt(positions.average[i], 1)})`,
            })),
          }))}
        />
      </Panel>
      <Panel
        title="Team MVPs"
        description="Each manager's top three players by points in their lineup. Most reliant on one player first."
        method="Points count only weeks the player started for that manager. Share is the top player's part of all the team's starter points."
      >
        <SimpleTable
          head={["Manager", "MVP", "Share", "2nd", "3rd"]}
          align={["left", "left", "right", "left", "left"]}
          highlight={(i) => mvps[i].manager === highlighted}
          rows={mvps.map((m) => [m.manager, mvp(m.players[0]), percent(m.share), mvp(m.players[1]), mvp(m.players[2])])}
        />
      </Panel>
    </Section>
  )
}
