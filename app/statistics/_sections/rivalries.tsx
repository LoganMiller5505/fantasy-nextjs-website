"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { rivalry, type Side, type closestRivalries, type nemeses } from "../_lib/stats"
import { Chart, Legend, Panel, Picker, SERIES, SimpleTable, StatTile, TileGrid, fmt } from "../_components/ui"

export type Pair = [string | null, string | null]

// Fewer meetings than this are listed in a table; a chart of one or two bars says little
const CHART_MEETINGS = 3

// One rivalry in detail. Either manager can be unpicked, which asks for a pick instead.
export function Rivalry({
  sides,
  managers,
  pair: [a, b],
  setRivalry,
}: {
  sides: Side[]
  managers: string[]
  // The pair lives on the page, so the head-to-head grid can open any rivalry here
  pair: Pair
  setRivalry: (pair: Pair) => void
}) {
  const series = React.useMemo(() => (a && b ? rivalry(sides, a, b) : null), [sides, a, b])
  const config = {
    margin: { label: "Margin" },
    a: { label: `${a} won`, theme: SERIES.blue },
    b: { label: `${b} won`, theme: SERIES.red },
  } satisfies ChartConfig
  const last = series?.games.at(-1)

  return (
    <Panel
      id="rivalry"
      title={a && b ? `${a} vs ${b}` : "Pick a rivalry"}
      description={a && b ? `${a}'s record against ${b}, every meeting including the playoffs.` : "Any two managers' head-to-head history."}
      controls={
        <>
          <Picker
            label="First manager"
            placeholder="Pick a manager"
            value={a}
            options={managers.filter((m) => m !== b)}
            onChange={(m) => setRivalry([m, b])}
          />
          <span className="text-muted-foreground text-sm">vs</span>
          <Picker
            label="Second manager"
            placeholder="Pick an opponent"
            value={b}
            options={managers.filter((m) => m !== a)}
            onChange={(m) => setRivalry([a, m])}
          />
        </>
      }
    >
      {!series ? (
        <p className="text-muted-foreground text-sm">Pick two managers, or tap a cell in the grid below.</p>
      ) : !last ? (
        <p className="text-muted-foreground text-sm">These two have never played each other.</p>
      ) : (
        <div className="grid gap-4">
          {/* With one meeting, the average is just that game, so it's left to the last-meeting tile */}
          <TileGrid wide={series.games.length > 1 ? 4 : 3}>
            <StatTile label="Series" value={`${series.wins}-${series.losses}`} detail={`${a}'s record against ${b}`} />
            {series.games.length > 1 && (
              <StatTile
                label="Points"
                value={`${fmt(series.pf / series.games.length, 1)} – ${fmt(series.pa / series.games.length, 1)}`}
                detail="Average per meeting"
              />
            )}
            <StatTile
              label="Streak"
              value={series.streak ? `${series.streak.holder} ${series.streak.length}` : "—"}
              detail={
                series.streak
                  ? series.streak.length === 1
                    ? `${series.streak.holder} won the last meeting`
                    : `${series.streak.holder} has won the last ${series.streak.length}`
                  : ""
              }
            />
            <StatTile label="Last meeting" value={`${fmt(last.pf, 1)} – ${fmt(last.pa, 1)}`} detail={last.playoff ? `${last.when}, playoffs` : last.when} />
          </TileGrid>
          {series.games.length < CHART_MEETINGS ? (
            series.games.length > 1 && (
              <div className="grid gap-2">
                <h4 className="text-sm font-medium">Every meeting</h4>
                <SimpleTable
                  head={["When", a!, b!, "Winner"]}
                  align={["left", "right", "right", "left"]}
                  rows={series.games.map((g) => [
                    g.playoff ? `${g.when}, playoffs` : g.when,
                    fmt(g.pf),
                    fmt(g.pa),
                    g.margin > 0 ? a : b,
                  ])}
                />
              </div>
            )
          ) : (
            <div className="grid gap-2">
              <h4 className="text-sm font-medium">Every meeting</h4>
              <p className="text-muted-foreground text-xs">
                Margin from {a}&apos;s side: above the line {a} won, below {b} won. Tap or hover a bar for the score.
              </p>
              <Chart config={config} className="aspect-auto h-64 w-full">
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
                        labelFormatter={(_, p) => `${p?.[0]?.payload.when}${p?.[0]?.payload.playoff ? ", playoffs" : ""}`}
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
              </Chart>
              <Legend items={[{ label: `${a} won`, color: SERIES.blue }, { label: `${b} won`, color: SERIES.red }]} />
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

// League-wide lists: the most even rivalries, and each manager's nemesis and favourite victim
export function LeagueRivalries({
  closest,
  foes,
  highlighted,
  openRivalry,
}: {
  closest: ReturnType<typeof closestRivalries>
  foes: ReturnType<typeof nemeses>
  highlighted: string | null
  // Opens a rivalry and scrolls up to it
  openRivalry: (a: string, b: string) => void
}) {
  return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Closest rivalries" description="The most even series in the league: closest to a tied record first, then the smallest average margin." method="All-time pairs with at least 3 meetings, playoffs included.">
          <SimpleTable
            head={["Pair", "Meetings", "Series", "Avg margin"]}
            align={["left", "right", "left", "right"]}
            rows={closest.map((r) => [r.pair, r.games, r.series, fmt(r.avgMargin, 1)])}
          />
        </Panel>
        <Panel
          title="Nemesis and favourite victim"
          description="Each manager's worst and best record against one opponent, all-time. Tap a name to open that rivalry."
          method="Only opponents met at least twice count. Ties go to the opponent played most, then the biggest points gap across those games."
        >
          <SimpleTable
            head={["Manager", "Nemesis", "Record", "Favourite victim", "Record"]}
            align={["left", "left", "right", "left", "right"]}
            highlight={(i) => foes[i].manager === highlighted}
            rows={foes.map((f) => [
              f.manager,
              f.nemesis ? (
                <button key="n" type="button" className="underline-offset-2 hover:underline" onClick={() => openRivalry(f.manager, f.nemesis!.opponent)}>
                  {f.nemesis.opponent}
                </button>
              ) : "—",
              f.nemesis?.record ?? "",
              f.victim ? (
                <button key="v" type="button" className="underline-offset-2 hover:underline" onClick={() => openRivalry(f.manager, f.victim!.opponent)}>
                  {f.victim.opponent}
                </button>
              ) : "—",
              f.victim?.record ?? "",
            ])}
          />
        </Panel>
      </div>
  )
}
