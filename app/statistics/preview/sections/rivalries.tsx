"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { rivalry, type Side, type closestRivalries } from "../stats"
import { Controls, Legend, Panel, Picker, SERIES, SimpleTable, StatTile, fmt } from "../ui"

export function Rivalries({
  sides,
  managers,
  closest,
}: {
  sides: Side[]
  managers: string[]
  closest: ReturnType<typeof closestRivalries>
}) {
  const [a, setA] = React.useState("Logan")
  const [b, setB] = React.useState("Andy")
  const series = React.useMemo(() => rivalry(sides, a, b), [sides, a, b])
  const config = {
    margin: { label: "Margin" },
    a: { label: `${a} won`, theme: SERIES.blue },
    b: { label: `${b} won`, theme: SERIES.orange },
  } satisfies ChartConfig

  return (
    <div className="grid gap-4">
      <Controls>
        <Picker label="First manager" value={a} options={managers.filter((m) => m !== b)} onChange={setA} />
        <span className="text-muted-foreground">vs</span>
        <Picker label="Second manager" value={b} options={managers.filter((m) => m !== a)} onChange={setB} />
      </Controls>

      {series.games.length === 0 ? (
        <Panel title={`${a} vs ${b}`}>
          <p className="text-muted-foreground">These two have never played each other.</p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Series" value={`${series.wins}-${series.losses}`} detail={`${a}'s record against ${b}`} />
            <StatTile
              label="Points"
              value={`${fmt(series.pf / series.games.length, 1)} – ${fmt(series.pa / series.games.length, 1)}`}
              detail="Average per meeting"
            />
            <StatTile
              label="Streak"
              value={series.streak ? `${series.streak.length}` : "—"}
              detail={series.streak ? `${series.streak.holder} has won the last ${series.streak.length}` : ""}
            />
            <StatTile
              label="Last meeting"
              value={`${fmt(series.games.at(-1)!.pf, 1)} – ${fmt(series.games.at(-1)!.pa, 1)}`}
              detail={series.games.at(-1)!.when}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Every meeting" description={`Margin from ${a}'s side: above the line ${a} won, below ${b} won.`}>
              <ChartContainer config={config} className="aspect-auto h-64 w-full">
                <BarChart data={series.games} margin={{ top: 8, right: 8, left: -16 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="when" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideIndicator
                        formatter={(_, __, item) => `${a} ${fmt(item.payload.pf)} – ${fmt(item.payload.pa)} ${b}`}
                      />
                    }
                  />
                  <Bar dataKey="margin" radius={4} maxBarSize={40}>
                    {series.games.map((g) => (
                      <Cell key={g.when} fill={g.margin > 0 ? "var(--color-a)" : "var(--color-b)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <Legend items={[{ label: `${a} won`, color: SERIES.blue }, { label: `${b} won`, color: SERIES.orange }]} />
            </Panel>
            <Panel title="Game log">
              <SimpleTable
                head={["When", a, b, "Winner"]}
                align={["left", "right", "right", "left"]}
                rows={series.games.map((g) => [
                  g.playoff ? `${g.when} (playoffs)` : g.when,
                  fmt(g.pf),
                  fmt(g.pa),
                  g.margin > 0 ? a : b,
                ])}
              />
            </Panel>
          </div>
        </>
      )}

      <Panel title="Closest rivalries" description="All-time pairs with 3+ meetings: tied series first, then the smallest average margin.">
        <SimpleTable
          head={["Pair", "Meetings", "Series", "Avg margin"]}
          align={["left", "right", "left", "right"]}
          rows={closest.map((r) => [r.pair, r.games, r.series, fmt(r.avgMargin, 1)])}
        />
      </Panel>
    </div>
  )
}
