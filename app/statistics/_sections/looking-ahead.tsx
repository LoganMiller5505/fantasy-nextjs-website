"use client"

import { emphasis } from "../_components/highlight"
import { cn } from "cn"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { lookingAhead } from "../_lib/stats"
import { Legend, Panel, SERIES, fmt, pctFmt } from "../_components/ui"

type Ahead = NonNullable<ReturnType<typeof lookingAhead>>

const config = {
  vsEven: { label: "Remaining opponents' win %" },
  tougher: { label: "Tougher than .500", theme: SERIES.red },
  easier: { label: "Easier than .500", theme: SERIES.blue },
} satisfies ChartConfig

export function Matchups({ data, highlighted }: { data: Ahead; highlighted: string | null }) {
  return (
    <Panel title={`${data.year} ${data.label}`} description="Next week's games, with each side's record and points per game this season.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.matchups.map((m) => (
          <Card
            key={m.home.manager}
            size="sm"
            className={cn("bg-muted/30", (m.home.manager === highlighted || m.away.manager === highlighted) && "ring-2 ring-(--highlight)")}
          >
            <CardHeader>
              <CardTitle className="flex items-baseline justify-between gap-2">
                <span>{m.home.manager}</span>
                <span className="text-muted-foreground text-xs font-normal">vs</span>
                <span>{m.away.manager}</span>
              </CardTitle>
              <CardDescription className="flex justify-between tabular-nums">
                <span>{m.home.record} · {fmt(m.home.ppg, 1)} ppg</span>
                <span>{m.away.record} · {fmt(m.away.ppg, 1)} ppg</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
              {m.last
                ? `All-time: ${m.home.manager} ${m.h2h} · last met ${m.last.when}, ${m.last.margin > 0 ? m.home.manager : m.away.manager} won`
                : "First ever meeting"}
            </CardContent>
          </Card>
        ))}
      </div>
    </Panel>
  )
}

// Bars run from a .500 line, so the axis only spans the spread between schedules and small
// differences read clearly. The limit is the biggest gap from .500, rounded out to .025.
export function RoadAhead({ data, highlighted }: { data: Ahead; highlighted: string | null }) {
  const chart = data.schedule.map((s) => ({ ...s, vsEven: Math.round((s.oppPct - 0.5) * 1000) / 1000 }))
  const limit = Math.max(0.025, Math.ceil(Math.max(...chart.map((s) => Math.abs(s.vsEven))) / 0.025) * 0.025)

  return (
    <Panel
      title="Toughest road ahead"
      description="How good each manager's remaining opponents are, measured from .500. Red is a tougher run-in, blue an easier one."
      method="Each bar is the average current win % of the manager's remaining regular-season opponents. Tap or hover a bar for that average and the opponents' points per game."
    >
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height: chart.length * 28 + 40 }}>
        <BarChart data={chart} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            domain={[-limit, limit]}
            ticks={Array.from({ length: Math.round((2 * limit) / 0.025) + 1 }, (_, i) => -limit + i * 0.025)}
            tickFormatter={(v: number) => pctFmt(v + 0.5)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis type="category" dataKey="manager" tickLine={false} axisLine={false} width={72} />
          <ReferenceLine x={0} stroke="var(--border)" />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(_, __, item) => (
                  <div className="grid gap-0.5 tabular-nums">
                    <span>Opponents&apos; win % {pctFmt(item.payload.oppPct)}</span>
                    <span className="text-muted-foreground">Opponents&apos; PPG {fmt(item.payload.oppPpg, 1)}</span>
                  </div>
                )}
              />
            }
          />
          {/* An exactly even schedule still gets a sliver, in grey, so it doesn't look like missing data */}
          <Bar dataKey="vsEven" radius={4} minPointSize={3}>
            {chart.map((s) => (
              <Cell
                key={s.manager}
                fill={s.vsEven > 0 ? "var(--color-tougher)" : s.vsEven < 0 ? "var(--color-easier)" : "var(--muted-foreground)"}
                fillOpacity={emphasis(s.manager, highlighted)}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <Legend items={[{ label: "Tougher than .500", color: SERIES.red }, { label: "Easier than .500", color: SERIES.blue }]} />
    </Panel>
  )
}
