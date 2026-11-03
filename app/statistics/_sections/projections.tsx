"use client"

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { emphasis } from "../_components/highlight"
import { scopeLabel, when } from "../_components/scope"
import { SortableHeader, numeric, sortFn_record } from "../_components/table-helpers"
import { Chart, Legend, ManagerLink, Panel, SERIES, Section, SimpleTable, StatTile, TileGrid, fmt } from "../_components/ui"
import type { ProjectionRow, projectedUpsets } from "../_lib/espn/projections"
import type { Scope } from "../_lib/stats"

export type ProjectionData = { rows: ProjectionRow[] } & ReturnType<typeof projectedUpsets>

const signed = (x: number, places = 1) => (x > 0 ? `+${x.toFixed(places)}` : x.toFixed(places))

const columnHelper = createColumnHelper<DataTableFeatures, ProjectionRow>()
const keys = ["Weeks", "Actual/wk", "Proj/wk", "+/- per wk", "Beat proj"] as const

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
      ...(key === "Beat proj" && { sortFn: sortFn_record }),
      ...(key === "+/- per wk" && { cell: ({ getValue }) => signed(Number(getValue())) }),
    })
  ),
])

const config = {
  over: { label: "Beat their projections", theme: SERIES.blue },
  under: { label: "Fell short of their projections", theme: SERIES.red },
} satisfies ChartConfig

export function ProjectionsSection({ data, scope, highlighted }: { data: ProjectionData; scope: Scope; highlighted: string | null }) {
  const { rows, upsets, records, games, favouritesWon } = data
  const top = rows[0]
  const bottom = rows[rows.length - 1]

  return (
    <Section title="Projections" description="How each team did against ESPN's own projections for the players in its lineup.">
      <TileGrid>
        <StatTile
          label="ESPN's favourite won"
          value={games ? `${Math.round((100 * favouritesWon) / games)}%` : "—"}
          detail={`${favouritesWon} of ${games} games`}
        />
        <StatTile
          label="Biggest upset"
          value={upsets[0]?.winner ?? "—"}
          detail={upsets[0] ? `Projected ${fmt(upsets[0].gap, 1)} behind ${upsets[0].loser}, won by ${fmt(upsets[0].winnerPts - upsets[0].loserPts, 1)}` : "None yet"}
        />
        <StatTile label="Beat projections most" value={top.player} detail={`${signed(top["+/- per wk"])} points a week`} />
        <StatTile label="Fell furthest short" value={bottom.player} detail={`${signed(bottom["+/- per wk"])} points a week`} />
      </TileGrid>
      <Panel
        title={`Points against projection · ${scopeLabel(scope)}`}
        description="Each manager's starters' actual points minus ESPN's projections for them, per week."
        method="The projection is ESPN's pre-game projection for each player who started, added up for the lineup. Regular season only."
      >
        <Chart config={config} className="aspect-auto w-full" style={{ height: rows.length * 30 + 40 }}>
          <BarChart data={rows} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="player" tickLine={false} axisLine={false} width={72} />
            <ReferenceLine x={0} stroke="var(--border)" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(v) => `${signed(Number(v))} points a week vs projection`} />} />
            <Bar dataKey="+/- per wk" radius={4}>
              {rows.map((r) => (
                <Cell
                  key={r.player}
                  fill={r["+/- per wk"] >= 0 ? "var(--color-over)" : "var(--color-under)"}
                  fillOpacity={emphasis(r.player, highlighted)}
                />
              ))}
            </Bar>
          </BarChart>
        </Chart>
        <Legend items={[{ label: "Beat their projections", color: SERIES.blue }, { label: "Fell short", color: SERIES.red }]} />
      </Panel>
      <Panel title="Actual against projected" description="Beat proj is the weeks a lineup scored more than projected, and the weeks it scored less.">
        <DataTable columns={columns} data={rows} initialSorting={[{ id: "+/- per wk", desc: true }]} highlight={(r) => r.player === highlighted} />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Biggest upsets"
          description="Wins by the team ESPN projected to lose, by how far behind it was projected."
          method="A game's projected scores are the two lineups' projections added up, as they were set."
        >
          {upsets.length ? (
            <SimpleTable
              head={["Week", "Winner", "Loser", "Projected", "Final"]}
              align={["left", "left", "left", "right", "right"]}
              highlight={(i) => upsets[i].winner === highlighted || upsets[i].loser === highlighted}
              rows={upsets.map((u) => [
                when(scope, u.year, u.short),
                u.winner,
                u.loser,
                `${fmt(u.winnerProj, 1)}–${fmt(u.loserProj, 1)}`,
                `${fmt(u.winnerPts, 1)}–${fmt(u.loserPts, 1)}`,
              ])}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No upsets in this span.</p>
          )}
        </Panel>
        <Panel title="As favourite and underdog" description="Records when ESPN projected each manager to win, and to lose. Most underdog wins first.">
          <SimpleTable
            head={["Manager", "As favourite", "As underdog"]}
            align={["left", "right", "right"]}
            highlight={(i) => records[i].manager === highlighted}
            rows={records.map((r) => [r.manager, `${r.favW}-${r.favL}`, `${r.dogW}-${r.dogL}`])}
          />
        </Panel>
      </div>
    </Section>
  )
}
