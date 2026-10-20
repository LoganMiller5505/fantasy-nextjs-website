"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "../../data-table"
import { SortableHeader, sortFn_numeric } from "../../columns"
import { type DataTableFeatures } from "../../data-table-features"
import { CLOSE_GAME, type LuckRow } from "../stats"
import { Controls, Legend, Panel, Picker, SERIES, SimpleTable } from "../ui"

const columnHelper = createColumnHelper<DataTableFeatures, LuckRow>()
const keys = [
  "Record", "All-play", "All-play%", "Exp W", "Luck", "Median", "Top weeks", "Bottom weeks", "Lucky W", "Unlucky L", "Close",
] as const
const textKeys = new Set<string>(["Record", "All-play", "Median", "Close"])

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
      ...(key === "All-play%" && { cell: ({ getValue }) => Number(getValue()).toFixed(3) }),
      ...(key === "Luck" && {
        cell: ({ getValue }) => {
          const v = Number(getValue())
          return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)
        },
      }),
    })
  ),
])

const config = {
  Luck: { label: "Wins vs expected" },
  lucky: { label: "Luckier than expected", theme: SERIES.blue },
  unlucky: { label: "Unluckier than expected", theme: SERIES.red },
} satisfies ChartConfig

type Scope = number | "all"

export function Luck({ bySeason }: { bySeason: Record<string, LuckRow[]> }) {
  const scopes: Scope[] = ["all", ...Object.keys(bySeason).filter((k) => k !== "all").map(Number).sort((a, b) => b - a)]
  const [scope, setScope] = React.useState<Scope>(scopes[1])
  const rows = bySeason[String(scope)]
  const chart = [...rows].sort((a, b) => b.Luck - a.Luck)
  const close = rows
    .map((r) => {
      const [w, l] = r.Close.split("-").map(Number)
      return { manager: r.player, w, l }
    })
    .filter((r) => r.w + r.l > 0)
    .sort((a, b) => b.w / (b.w + b.l) - a.w / (a.w + a.l) || b.w + b.l - (a.w + a.l))
  const breaks = [...rows].sort((a, b) => b["Unlucky L"] - b["Lucky W"] - (a["Unlucky L"] - a["Lucky W"]))

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
        title="Luck"
        description="Actual wins minus expected wins, where expected wins assume you played every team every week (regular season only)."
      >
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: chart.length * 30 + 40 }}>
          <BarChart data={chart} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="player" tickLine={false} axisLine={false} width={72} />
            <ReferenceLine x={0} stroke="var(--border)" />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideIndicator formatter={(v) => `${Number(v) > 0 ? "+" : ""}${v} wins vs expected`} />}
            />
            <Bar dataKey="Luck" radius={4}>
              {chart.map((r) => (
                <Cell key={r.player} fill={r.Luck >= 0 ? "var(--color-lucky)" : "var(--color-unlucky)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <Legend items={[{ label: "Luckier than expected", color: SERIES.blue }, { label: "Unluckier than expected", color: SERIES.red }]} />
      </Panel>
      <Panel
        title="All-play and median records"
        description={`All-play: your record if you played everyone each week. Median: a win for every week above the league median. Top/bottom weeks: highest or lowest score that week. Lucky W: won while below the week's median. Unlucky L: lost while above it. Close: games decided by under ${CLOSE_GAME} points.`}
      >
        <DataTable columns={columns} data={rows} initialSorting={[{ id: "Luck", desc: true }]} />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Breaks of the game" description="Losses despite a top-half score against wins despite a bottom-half one. Most hard done by first.">
          <SimpleTable
            head={["Manager", "Unlucky losses", "Lucky wins", "Net"]}
            align={["left", "right", "right", "right"]}
            rows={breaks.map((r) => {
              const net = r["Unlucky L"] - r["Lucky W"]
              return [r.player, r["Unlucky L"], r["Lucky W"], net > 0 ? `+${net}` : net]
            })}
          />
        </Panel>
        <Panel title="Close games" description={`Record in games decided by under ${CLOSE_GAME} points. Best record first.`}>
          {close.length ? (
            <SimpleTable
              head={["Manager", "Close W-L", "Games"]}
              align={["left", "right", "right"]}
              rows={close.map((r) => [r.manager, `${r.w}-${r.l}`, r.w + r.l])}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No games that close in this span.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
