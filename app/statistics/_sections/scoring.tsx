"use client"

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { HighlightPicker, emphasis, useHighlight } from "../_components/highlight"
import { ScopeToggle, Toolbar, scopeLabel, useScope } from "../_components/scope"
import { SortableHeader, numeric, points } from "../_components/table-helpers"
import { HeatTable, Panel, SERIES, Section, fmt, pctFmt } from "../_components/ui"
import type { ConsistencyRow } from "../_lib/more-stats"
import type { Scope, ScoringRow, scoringRanks, scoringTrend, strongFinish } from "../_lib/stats"
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

const config = {
  ppg: { label: "Points for / game", theme: SERIES.blue },
  papg: { label: "Points against / game", theme: SERIES.orange },
} satisfies ChartConfig

// Seasons take categorical slots in order, oldest first, so a season keeps its colour
const SEASON_COLORS = [SERIES.blue, SERIES.orange, SERIES.aqua]

function PointsForAgainst({ rows, scope, highlighted }: { rows: ScoringRow[]; scope: Scope; highlighted: string | null }) {
  const perGame = [...rows]
    .sort((a, b) => b.PPG - a.PPG)
    .map((r) => ({ manager: r.player, ppg: r.PPG, papg: r["PA/G"] }))
  // The axis starts just under the lowest bar, so 10-20 point gaps are easy to see
  const floor = Math.floor((Math.min(...perGame.flatMap((r) => [r.ppg, r.papg])) - 10) / 10) * 10

  return (
    <Panel
      title={`Points for vs against, per game · ${scopeLabel(scope)}`}
      description="Sorted by points for. Bars further apart = a bigger edge."
      method={`The axis starts at ${floor}, not zero, so the gaps between the bars stand out. Double weeks are left out.`}
    >
      <ChartContainer config={config} className="aspect-auto h-80 w-full">
        <BarChart data={perGame} barGap={2} barCategoryGap={8} margin={{ top: 8, right: 8, left: -12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="manager" tickLine={false} axisLine={false} interval={0} angle={-40} textAnchor="end" height={56} />
          <YAxis tickLine={false} axisLine={false} domain={[floor, "auto"]} allowDataOverflow allowDecimals={false} width={48} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v, name) => `${config[name as keyof typeof config].label} ${fmt(Number(v))}`} />} />
          <ChartLegend content={<ChartLegendContent />} verticalAlign="top" itemSorter={null} />
          {(["ppg", "papg"] as const).map((key) => (
            <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[4, 4, 0, 0]}>
              {perGame.map((r) => (
                <Cell key={r.manager} fillOpacity={emphasis(r.manager, highlighted)} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
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
      <ChartContainer config={trendConfig} className="aspect-auto h-72 w-full">
        <LineChart data={trend.data} margin={{ top: 8, right: 12, left: -12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} domain={["auto", "auto"]} allowDecimals={false} width={48} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} verticalAlign="top" itemSorter={null} />
          {trend.years.map((y) => (
            <Line key={y} dataKey={y} type="linear" stroke={`var(--color-${y})`} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
          ))}
        </LineChart>
      </ChartContainer>
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

// Fewer games than this and an all-time row is muted: too few to compare with full careers
const FEW_GAMES = 10

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
          description={`Points, record and margin for every manager.${scope === "all" ? ` Managers with fewer than ${FEW_GAMES} games are greyed out.` : ""}`}
          method="Record, PF and PA count every game, consolation games included. PPG and PA/G skip double weeks, which cover two NFL weeks. Top and bottom weeks are regular-season weeks with the league's highest or lowest score."
        >
          <DataTable
            columns={columns}
            data={scoped}
            initialSorting={[{ id: "PPG", desc: true }]}
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
