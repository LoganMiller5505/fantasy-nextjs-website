"use client"

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { emphasis } from "../../_components/highlight"
import { scopeLabel, when } from "../../_components/scope"
import { Chart, Legend, Panel, SERIES, Section, SimpleTable, fmt } from "../../_components/ui"
import type { LuckAdditionsData } from "../../_lib/espn/additions"
import type { Scope } from "../../_lib/stats"
import { ProjectionsSection } from "../projections"

const percent = (x: number) => `${(100 * x).toFixed(1)}%`
const signed = (x: number) => (x > 0 ? `+${x.toFixed(1)}` : x.toFixed(1))

const config = {
  better: { label: "Opponents set better lineups against them", theme: SERIES.red },
  worse: { label: "Opponents set worse lineups against them", theme: SERIES.blue },
} satisfies ChartConfig

// How teams fared against ESPN's projections, whether opponents saved their best lineups for them,
// and the games turned on the last day of the week
export function LuckAdditions({ data, scope, highlighted }: { data: LuckAdditionsData; scope: Scope; highlighted: string | null }) {
  const rows = data.opponents
  const { swings } = data
  return (
    <>
      <ProjectionsSection data={data.projections} scope={scope} highlighted={highlighted} />
      <Section title="Opponents' lineups" description="Luck you can't see in the scores: how well opponents set their lineups when they played you.">
        <Panel
          title={`Opponents' lineups against you · ${scopeLabel(scope)}`}
          description="Percentage points above or below those opponents' usual lineup efficiency. Above zero, opponents played their best against you."
          method="For each manager, the lineup efficiency (points started over the best possible lineup) of the opponents they played, against the same opponents' efficiency across the span, weighted by games. Regular season only."
        >
          <Chart config={config} className="aspect-auto w-full" style={{ height: rows.length * 30 + 40 }}>
            <BarChart data={rows} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="player" tickLine={false} axisLine={false} width={72} />
              <ReferenceLine x={0} stroke="var(--border)" />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(v) => `${signed(Number(v))} points of efficiency vs usual`} />} />
              <Bar dataKey="Diff" radius={4}>
                {rows.map((r) => (
                  <Cell key={r.player} fill={r.Diff >= 0 ? "var(--color-better)" : "var(--color-worse)"} fillOpacity={emphasis(r.player, highlighted)} />
                ))}
              </Bar>
            </BarChart>
          </Chart>
          <Legend items={[{ label: "Opponents played above their usual", color: SERIES.red }, { label: "Below their usual", color: SERIES.blue }]} />
        </Panel>
        <Panel title="The numbers" description="Opponents' efficiency in games against each manager, and the same opponents' usual efficiency.">
          <SimpleTable
            head={["Manager", "Games", "Against you", "Their usual", "Difference"]}
            align={["left", "right", "right", "right", "right"]}
            highlight={(i) => rows[i].player === highlighted}
            rows={rows.map((r) => [r.player, r.Games, percent(r["Vs you"]), percent(r.Usual), `${signed(r.Diff)} pts`])}
          />
        </Panel>
      </Section>
      <Section title="Final-day swings" description="Games turned on the week's last game day, usually Monday night.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Panel
            title={`Comebacks and collapses · ${scopeLabel(scope)}`}
            description="Wins after trailing going into the last game day, and losses after leading. Best net first."
            method="Each lineup's points from games before the week's last game day (the latest kickoff date that NFL week, in Eastern time), against the opponent's. A comeback is a win from behind at that point; a collapse, a loss from ahead. Games tied going in count as neither. Regular season only."
          >
            <SimpleTable
              head={["Manager", "Games", "Comebacks", "Collapses", "Net"]}
              align={["left", "right", "right", "right", "right"]}
              highlight={(i) => swings.rows[i].player === highlighted}
              rows={swings.rows.map((r) => [r.player, r.Games, r.Comebacks, r.Collapses, r.Net > 0 ? `+${r.Net}` : r.Net])}
            />
          </Panel>
          <Panel title="Biggest comebacks" description="By how far behind the winner was going into the last game day.">
            {swings.biggest.length ? (
              <SimpleTable
                head={["Week", "Winner", "Loser", "Behind by", "Final"]}
                align={["left", "left", "left", "right", "right"]}
                highlight={(i) => swings.biggest[i].winner === highlighted || swings.biggest[i].loser === highlighted}
                rows={swings.biggest.map((c) => [when(scope, c.year, c.short), c.winner, c.loser, fmt(c.deficit, 1), `${fmt(c.pf, 1)}–${fmt(c.pa, 1)}`])}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No final-day comebacks in this span.</p>
            )}
          </Panel>
        </div>
      </Section>
    </>
  )
}
