"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { lookingAhead } from "../stats"
import { Panel, SERIES, SimpleTable, fmt } from "../ui"

type Ahead = NonNullable<ReturnType<typeof lookingAhead>>

const config = { oppPct: { label: "Remaining opponents' win %", theme: SERIES.blue } } satisfies ChartConfig

export function LookingAhead({ data }: { data: Ahead | null }) {
  if (!data) return <p className="text-muted-foreground">Every game this season has been played.</p>

  return (
    <div className="grid gap-4">
      <h3 className="font-medium">{data.year} {data.label}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.matchups.map((m) => (
          <Card key={m.home.manager} size="sm">
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
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Toughest road ahead" description="Average current win % of each manager's remaining opponents.">
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height: data.schedule.length * 28 + 40 }}>
            <BarChart data={data.schedule} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="manager" tickLine={false} axisLine={false} width={72} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => `${v}%`} />} />
              <Bar dataKey="oppPct" fill="var(--color-oppPct)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </Panel>
        <Panel title="Remaining schedule">
          <SimpleTable
            head={["Manager", "Games left", "Opp win %", "Opp PPG"]}
            align={["left", "right", "right", "right"]}
            rows={data.schedule.map((s) => [s.manager, s.remaining, `${fmt(s.oppPct, 1)}%`, fmt(s.oppPpg, 1)])}
          />
        </Panel>
      </div>
    </div>
  )
}
