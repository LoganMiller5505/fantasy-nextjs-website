"use client"

import { emphasis } from "../_components/highlight"
import { cn } from "cn"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { Flame } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { lookingAhead } from "../_lib/stats"
import { Chart, Legend, Panel, SERIES, fmt, pctFmt } from "../_components/ui"

type Ahead = NonNullable<ReturnType<typeof lookingAhead>>

const config = {
  vsEven: { label: "Remaining opponents' win %" },
  tougher: { label: "Tougher than .500", theme: SERIES.red },
  easier: { label: "Easier than .500", theme: SERIES.blue },
} satisfies ChartConfig

// Odds as whole percents, with "<1%" for anything that's possible but rounds to nothing
const oddsText = (p: number) => (p >= 0.5 ? `${Math.round(p)}%` : p > 0 ? "<1%" : "0%")

export type MatchupOdds = { playoffs: number; next: { win: number; loss: number } | null }

// How much a game moves both sides' playoff odds: each one's odds with a win less with a loss, added
const stakes = (odds: Record<string, MatchupOdds> | undefined, a: string, b: string) => {
  const swing = (m: string) => (odds?.[m]?.next ? odds[m].next!.win - odds[m].next!.loss : 0)
  return { total: swing(a) + swing(b), a: swing(a), b: swing(b) }
}

// One side of a game: form, then playoff odds now, with a win and with a loss
function Side({ side, odds, end }: { side: Ahead["matchups"][number]["home"]; odds?: MatchupOdds; end?: boolean }) {
  return (
    <div className={cn("grid gap-0.5 tabular-nums", end && "text-right")}>
      <span>
        {side.record} · {fmt(side.ppg, 1)} ppg
      </span>
      {odds && (
        <>
          <span>{oddsText(odds.playoffs)} playoffs now</span>
          {odds.next && (
            <dl className={cn("grid grid-cols-[auto_auto] gap-x-2 text-xs", end ? "justify-end" : "justify-start")}>
              <dt>With a win</dt>
              <dd className="text-foreground font-medium">{oddsText(odds.next.win)}</dd>
              <dt>With a loss</dt>
              <dd className="text-foreground font-medium">{oddsText(odds.next.loss)}</dd>
            </dl>
          )}
        </>
      )}
    </div>
  )
}

// `odds`: each manager's playoff odds now and after next week's result, while there's a race to
// run. The game that moves its two managers' odds the most leads as the game of the week.
export function Matchups({ data, highlighted, odds }: { data: Ahead; highlighted: string | null; odds?: Record<string, MatchupOdds> }) {
  // Most riding on it first; without odds, the schedule's order
  const ordered = data.matchups
    .map((m) => ({ ...m, stakes: stakes(odds, m.home.manager, m.away.manager) }))
    .sort((a, b) => b.stakes.total - a.stakes.total)
  const featured = odds && ordered[0]?.stakes.total > 0 ? ordered[0] : null

  return (
    <Panel
      title={`${data.year} ${data.label}`}
      description={`Next week's games, with each side's record and points per game this season${odds ? ", and their playoff odds now, with a win and with a loss. Games are ordered by how much is riding on them, starting with the game of the week" : ""}.`}
      method={
        odds
          ? "With a win and with a loss come from the same simulations as the playoff odds below, split by how that manager's game next week went. A game's stakes are how far it moves both managers' odds (the gap between their win and loss odds, added); the game of the week has the biggest."
          : undefined
      }
    >
      {/* Cards keep the width of a three-column (two on tablets) grid, and a short last row is
          centred rather than left hanging on one side */}
      <div className="flex flex-wrap justify-center gap-3">
        {ordered.map((m) => {
          const isFeatured = m === featured
          return (
            <Card
              key={m.home.manager}
              size="sm"
              className={cn(
                "bg-muted/30",
                isFeatured
                  ? "basis-full bg-[color-mix(in_oklab,var(--highlight)_8%,var(--card))]"
                  : "basis-full sm:basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-1.5rem)/3)]",
                (m.home.manager === highlighted || m.away.manager === highlighted) && "ring-2 ring-(--highlight)"
              )}
            >
              <CardHeader>
                {isFeatured && (
                  <Badge variant="secondary" className="mb-1 w-fit">
                    <Flame className="size-3" aria-hidden />
                    Game of the week
                  </Badge>
                )}
                <CardTitle className={cn("flex items-baseline justify-between gap-2", isFeatured && "text-lg")}>
                  <span>{m.home.manager}</span>
                  <span className="text-muted-foreground text-xs font-normal">vs</span>
                  <span>{m.away.manager}</span>
                </CardTitle>
                <CardDescription className="flex justify-between gap-2">
                  <Side side={m.home} odds={odds?.[m.home.manager]} />
                  <Side side={m.away} odds={odds?.[m.away.manager]} end />
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground grid gap-1 text-xs">
                {isFeatured && (
                  <span className="text-foreground">
                    The most riding on it: {m.home.manager}&apos;s odds swing {Math.round(m.stakes.a)} points on the result, {m.away.manager}&apos;s{" "}
                    {Math.round(m.stakes.b)}.
                  </span>
                )}
                <span>
                  {m.last
                    ? `All-time: ${m.home.manager} ${m.h2h} · last met ${m.last.when}, ${m.last.margin > 0 ? m.home.manager : m.away.manager} won`
                    : "First ever meeting"}
                </span>
              </CardContent>
            </Card>
          )
        })}
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
      <Chart config={config} className="aspect-auto w-full" style={{ height: chart.length * 28 + 40 }}>
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
      </Chart>
      <Legend items={[{ label: "Tougher than .500", color: SERIES.red }, { label: "Easier than .500", color: SERIES.blue }]} />
    </Panel>
  )
}
