"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { HighlightPicker, emphasis, useHighlight } from "../_components/highlight"
import { ScopeToggle, Toolbar, scopeLabel, useScope } from "../_components/scope"
import { SortableHeader, numeric } from "../_components/table-helpers"
import { Legend, Panel, SERIES, Section, SimpleTable, fmt, pctFmt } from "../_components/ui"
import type { scheduleSwap } from "../_lib/more-stats"
import { CLOSE_GAME, type LuckRow, type Scope } from "../_lib/stats"
import { ScheduleSwap } from "./schedule-swap"

const columnHelper = createColumnHelper<DataTableFeatures, LuckRow>()
const keys = ["Record", "All-play", "All-play%", "Exp W", "Luck", "Median", "Lucky W", "Unlucky L", "Close"] as const
const textKeys = new Set<string>(["Record", "All-play", "Median", "Close"])

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
      ...(key === "All-play%" && { cell: ({ getValue }) => pctFmt(Number(getValue())) }),
      ...(key === "Exp W" && { cell: ({ getValue }) => fmt(Number(getValue()), 1) }),
      ...(key === "Luck" && {
        cell: ({ getValue }) => {
          const v = Number(getValue())
          return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)
        },
      }),
    })
  ),
])

// The breaks and close-game columns have their own tables on the page, so they start hidden here
const initialColumnVisibility = { "Lucky W": false, "Unlucky L": false, Close: false }

const config = {
  Luck: { label: "Wins vs expected" },
  lucky: { label: "Luckier than expected", theme: SERIES.blue },
  unlucky: { label: "Unluckier than expected", theme: SERIES.red },
} satisfies ChartConfig

// The headline (luck vs expected wins) first, then the quick tables that explain it, then the
// full breakdown and the what-if schedules
export function LuckView({
  initialScope,
  scopes,
  bySeason,
  swaps,
}: {
  initialScope: Scope
  scopes: Scope[]
  bySeason: Record<string, LuckRow[]>
  swaps: Record<number, ReturnType<typeof scheduleSwap>>
}) {
  const [scope, setScope] = useScope(initialScope)
  const rows = bySeason[String(scope)]
  const chart = [...rows].sort((a, b) => b.Luck - a.Luck)
  const managers = rows.map((r) => r.player)
  const [highlighted, setHighlighted] = useHighlight(managers)
  // Schedules only swap within one season: it follows the page's season, and has its own choice
  // of season while the page shows all-time
  const swapYears = Object.keys(swaps).map(Number).sort((a, b) => b - a)
  const [swapPick, setSwapPick] = React.useState(swapYears[0])
  const swapYear = scope === "all" ? swapPick : scope
  const close = rows
    .map((r) => {
      const [w, l] = r.Close.split("-").map(Number)
      return { manager: r.player, w, l }
    })
    .filter((r) => r.w + r.l > 0)
    .sort((a, b) => b.w / (b.w + b.l) - a.w / (a.w + a.l) || b.w + b.l - (a.w + a.l))
  // Net breaks: + is lucky, as on the luck chart
  const net = (r: LuckRow) => r["Lucky W"] - r["Unlucky L"]
  const breaks = [...rows].sort((a, b) => net(b) - net(a) || a.player.localeCompare(b.player))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <ScopeToggle value={scope} options={scopes} onChange={setScope} />
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} end />
      </Toolbar>
      <Section title="Luck">
        <Panel
          title={`Luck · ${scopeLabel(scope)}`}
          description="Wins above or below what each manager's scores deserved."
          method="Luck is actual wins minus expected wins. Each week is worth the share of the other teams you outscored as an expected win: the week's top score is worth 1, the lowest 0, and a middle score about 0.5. Regular season only."
        >
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height: chart.length * 30 + 40 }}>
            <BarChart data={chart} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="player" tickLine={false} axisLine={false} width={72} />
              <ReferenceLine x={0} stroke="var(--border)" />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideIndicator formatter={(v) => `${Number(v) > 0 ? "+" : ""}${fmt(Number(v), 1)} wins vs expected`} />}
              />
              <Bar dataKey="Luck" radius={4}>
                {chart.map((r) => (
                  <Cell
                    key={r.player}
                    fill={r.Luck >= 0 ? "var(--color-lucky)" : "var(--color-unlucky)"}
                    fillOpacity={emphasis(r.player, highlighted)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <Legend items={[{ label: "Luckier than expected", color: SERIES.blue }, { label: "Unluckier than expected", color: SERIES.red }]} />
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Breaks of the game"
            description="Wins despite a bottom-half score against losses despite a top-half one. Luckiest first."
            method="A lucky win is a win while scoring below that week's league median; an unlucky loss is a loss while scoring above it. Net is lucky wins minus unlucky losses. Above zero, the breaks went your way more often than not; below zero, they went against you."
          >
            <SimpleTable
              head={["Manager", "Lucky wins", "Unlucky losses", "Net"]}
              align={["left", "right", "right", "right"]}
              highlight={(i) => breaks[i].player === highlighted}
              rows={breaks.map((r) => [r.player, r["Lucky W"], r["Unlucky L"], net(r) > 0 ? `+${net(r)}` : net(r)])}
            />
          </Panel>
          <Panel title="Close games" description={`Record in games decided by under ${CLOSE_GAME} points. Best record first.`}>
            {close.length ? (
              <SimpleTable
                head={["Manager", "Close W-L", "Games"]}
                align={["left", "right", "right"]}
                highlight={(i) => close[i].manager === highlighted}
                rows={close.map((r) => [r.manager, `${r.w}-${r.l}`, r.w + r.l])}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No games that close in this span.</p>
            )}
          </Panel>
        </div>
        <Panel
          title="All-play and median records"
          description="What each record would be under other ways of scoring the season."
          method={`All-play: your record if you played everyone each week. Exp W: wins expected from all-play. Median: a win for every week above the league median. Lucky W, Unlucky L and Close (games decided by under ${CLOSE_GAME} points) start hidden, since the tables above show them; add them back with Columns.`}
        >
          <DataTable
            columns={columns}
            data={rows}
            initialColumnVisibility={initialColumnVisibility}
            initialSorting={[{ id: "Luck", desc: true }]}
            highlight={(r) => r.player === highlighted}
          />
        </Panel>
      </Section>
      <Section title="What if">
        <ScheduleSwap
          swap={swaps[swapYear]}
          highlighted={highlighted}
          controls={scope === "all" && <ScopeToggle value={swapPick} options={swapYears} onChange={setSwapPick} />}
        />
      </Section>
    </div>
  )
}
