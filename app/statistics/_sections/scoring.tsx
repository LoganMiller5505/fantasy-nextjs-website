"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import {
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { ScopeToggle, Toolbar, scopeLabel, useScope } from "../_components/scope"
import { SortableHeader, numeric, points } from "../_components/table-helpers"
import { Chart, DotPlot, HeatTable, ManagerLink, Panel, SERIES, Section, fmt, pctFmt } from "../_components/ui"
import type { ConsistencyRow } from "../_lib/more-stats"
import { FEW_GAMES, type Scope, type ScoringRow, type scoringRanks, type scoringTrend, type strongFinish } from "../_lib/stats"
import { Consistency } from "./consistency"
import { StrongFinish } from "./season-story"

const columnHelper = createColumnHelper<DataTableFeatures, ScoringRow>()
const keys = ["GP", "Record", "Win%", "PF", "PA", "PPG", "PA/G", "Diff", "Reg W-L", "Top weeks", "Bottom weeks"] as const
// Records like "19-19" sort as text; everything else is a number
const textKeys = new Set<string>(["Record", "Reg W-L"])

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
      ...(!textKeys.has(key) && numeric),
      ...(key === "Win%" && { cell: ({ getValue }) => pctFmt(Number(getValue())) }),
      ...((key === "PPG" || key === "PA/G") && { cell: ({ getValue }) => fmt(Number(getValue())) }),
      ...((key === "PF" || key === "PA" || key === "Diff") && {
        cell: ({ getValue }) => points(Number(getValue())),
      }),
    })
  ),
])

// Seasons take categorical slots in order, oldest first, so a season keeps its colour
const SEASON_COLORS = [SERIES.blue, SERIES.orange, SERIES.aqua]

// A dumbbell per manager: points for and against per game, joined by a line, on an axis that only
// spans the scores in play so a few points' gap shows
function PointsForAgainst({ rows, scope, highlighted }: { rows: ScoringRow[]; scope: Scope; highlighted: string | null }) {
  // Biggest edge (points for less points against, per game) first
  const perGame = [...rows].sort((a, b) => b.PPG - b["PA/G"] - (a.PPG - a["PA/G"]))

  return (
    <Panel
      title={`Points for vs against, per game · ${scopeLabel(scope)}`}
      description="Biggest edge first. A blue dot right of the orange one is outscoring opponents; the longer the line, the bigger the edge."
      method="The axis spans only the scores in play, not from zero, so a few points' difference shows. Double weeks are left out."
    >
      <DotPlot
        connect
        trailingLabel="Edge"
        series={[
          { key: "pf", label: "Points for / game", color: SERIES.blue },
          { key: "pa", label: "Points against / game", color: SERIES.orange },
        ]}
        rows={perGame.map((r) => {
          const diff = r.PPG - r["PA/G"]
          return {
            key: r.player,
            label: r.player,
            values: { pf: r.PPG, pa: r["PA/G"] },
            summary: `${fmt(r.PPG)} for, ${fmt(r["PA/G"])} against per game`,
            trailing: `${diff > 0 ? "+" : ""}${fmt(diff, 1)}`,
            highlighted: r.player === highlighted,
            faded: highlighted != null && r.player !== highlighted,
          }
        })}
      />
    </Panel>
  )
}

function LeagueTrend({ trend }: { trend: ReturnType<typeof scoringTrend> }) {
  const trendConfig = Object.fromEntries(
    trend.years.map((y, i) => [y, { label: y, theme: SEASON_COLORS[i % SEASON_COLORS.length] }])
  ) satisfies ChartConfig

  return (
    <Panel
      title="League scoring by week"
      description="Average score across the league each week, one line per season."
      method="Double weeks are left out, so 2024's playoff rounds don't appear."
    >
      <Chart config={trendConfig} className="aspect-auto h-72 w-full">
        <LineChart data={trend.data} margin={{ top: 8, right: 12, left: -12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} domain={["auto", "auto"]} allowDecimals={false} width={48} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} verticalAlign="top" itemSorter={null} />
          {trend.years.map((y) => (
            <Line key={y} dataKey={y} type="linear" stroke={`var(--color-${y})`} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </Chart>
    </Panel>
  )
}

function ScoringRanks({ data, scope, highlighted }: { data: ReturnType<typeof scoringRanks>; scope: Scope; highlighted: string | null }) {
  return (
    <Panel
      title="Scoring by season, ranked"
      description="Each manager's PPG rank in each season: #1 is that season's best scorer, and darker is higher. Tap or hover a cell for the PPG."
      method="Ranks are among that season's managers, so 10- and 12-team seasons compare on the same footing. Double weeks are left out. The season picked above is outlined."
    >
      <HeatTable
        corner="Manager"
        highlight={(m) => m === highlighted}
        columns={data.years.map(String)}
        rows={data.managers.map((m) => ({
          key: m,
          label: m,
          cells: data.years.map((y) => {
            const c = data.ranks[m]?.[y]
            return c
              ? {
                  text: `#${c.rank}`,
                  t: 1 - (c.rank - 1) / (c.of - 1),
                  title: `${m}, ${y}: ${fmt(c.ppg, 1)} PPG, #${c.rank} of ${c.of}`,
                  outlined: y === scope,
                }
              : { text: "", t: null, title: `${m} wasn't in the league in ${y}` }
          }),
        }))}
      />
    </Panel>
  )
}

// This scope's scoring first, then how steady it was, then views across every season
export function ScoringView({
  initialScope,
  scopes,
  rows,
  spread,
  trend,
  ranks,
  finish,
}: {
  initialScope: Scope
  scopes: Scope[]
  rows: Record<string, ScoringRow[]>
  spread: Record<string, ConsistencyRow[]>
  trend: ReturnType<typeof scoringTrend>
  ranks: ReturnType<typeof scoringRanks>
  finish: ReturnType<typeof strongFinish>
}) {
  const [scope, setScope] = useScope(initialScope)
  const scoped = rows[String(scope)]
  const managers = scoped.map((r) => r.player)
  const [highlighted, setHighlighted] = useHighlight(managers)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <ScopeToggle value={scope} options={scopes} onChange={setScope} />
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} end />
      </Toolbar>
      <Section title="Scoring">
        <Panel
          title={`Scoring · ${scopeLabel(scope)}`}
          description={`Points, record and margin for every manager.${scope === "all" ? ` Managers with fewer than ${FEW_GAMES} games are greyed out and listed last.` : ""}`}
          method="Record, PF and PA count every game, consolation games included. PPG and PA/G skip double weeks, which cover two NFL weeks. Top and bottom weeks are regular-season weeks with the league's highest or lowest score."
        >
          <DataTable
            columns={columns}
            data={scoped}
            initialSorting={[{ id: "PPG", desc: true }]}
            initialColumnVisibility={{ "Reg W-L": false, "Top weeks": false, "Bottom weeks": false }}
            phoneHidden={["GP", "PF", "PA", "PA/G", "Diff"]}
            highlight={(r) => r.player === highlighted}
            muted={(r) => scope === "all" && r.GP < FEW_GAMES}
          />
        </Panel>
        <PointsForAgainst rows={scoped} scope={scope} highlighted={highlighted} />
      </Section>
      <Section title="Consistency">
        <Consistency rows={spread[String(scope)]} scope={scope} highlighted={highlighted} />
      </Section>
      <Section title="Every season" description="These cover every season, whatever season is picked above.">
        <StrongFinish data={finish} year={scope === "all" ? null : scope} highlighted={highlighted} />
        <ScoringRanks data={ranks} scope={scope} highlighted={highlighted} />
        <LeagueTrend trend={trend} />
      </Section>
    </div>
  )
}
