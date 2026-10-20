"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { playoffRace } from "../playoff-race"
import { HeatTable, Panel, SERIES } from "../ui"

type Race = ReturnType<typeof playoffRace>

const config = { playoffs: { label: "Playoff odds", theme: SERIES.blue } } satisfies ChartConfig
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`

export function PlayoffRace({ race }: { race: Race }) {
  if (!race) {
    return (
      <Panel title="Playoff race">
        <p className="text-muted-foreground">No regular season in progress, so there&apos;s nothing to simulate.</p>
      </Panel>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground">
        {race.year}, {race.weeksLeft} regular-season weeks left. The rest of the season is played out{" "}
        {race.runs.toLocaleString("en-US")}{" "}times, with each manager scoring around their average this season (pulled
        halfway to the league&apos;s, since it&apos;s early). {race.spots} teams make the playoffs:
        {race.divisionSeeds > 0 && (
          <>
            {" "}the {race.divisionSeeds} division winners (best record, then points for) take seeds 1–{race.divisionSeeds},
            and the rest go to the best remaining records
          </>
        )}
        {race.divisionSeeds === 0 && " the best records"}, with points for breaking ties.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Playoff odds" description="Share of simulated seasons that end in a playoff spot.">
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height: race.rows.length * 30 + 40 }}>
            <BarChart data={race.rows} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 40 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="manager" tickLine={false} axisLine={false} width={72} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(v, _, item) => `${v}% · ${item.payload.record} now, ~${item.payload.projectedWins} wins projected`}
                  />
                }
              />
              <Bar dataKey="playoffs" fill="var(--color-playoffs)" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="playoffs" position="right" formatter={(v) => `${v}%`} className="fill-foreground" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </Panel>
        <Panel
          title="Where they finish"
          description={`Chance of each final seed${race.divisionSeeds ? ` (1st–${ordinal(race.divisionSeeds)} go to division winners)` : ""} and of winning the division. Darker is likelier. Clinched and eliminated only show once they're certain, so they can lag behind the odds.`}
        >
          <HeatTable
            corner="Manager"
            columns={[
              ...race.rows[0].seeds.map((_, i) => ordinal(i + 1)),
              "Out",
              ...(race.divisionSeeds ? ["Win div."] : []),
              "Proj. W",
            ]}
            rows={race.rows.map((r) => ({
              key: r.manager,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {r.manager}
                  {r.status && (
                    <Badge variant={r.status === "clinched" ? "secondary" : "outline"}>
                      {r.status === "clinched" ? "Clinched" : "Eliminated"}
                    </Badge>
                  )}
                </span>
              ),
              cells: [
                ...r.seeds.map((p, i) => ({
                  text: p >= 0.5 ? `${Math.round(p)}%` : p > 0 ? "<1%" : "",
                  t: p / 100,
                  title: `${r.manager}: ${p}% to finish ${ordinal(i + 1)}`,
                })),
                { text: `${Math.round(r.missed)}%`, t: null, title: `${r.manager}: ${r.missed}% to miss the playoffs` },
                ...(race.divisionSeeds
                  ? [{
                      text: r.divisionTitle >= 0.5 ? `${Math.round(r.divisionTitle)}%` : r.divisionTitle > 0 ? "<1%" : "",
                      t: r.divisionTitle / 100,
                      title: `${r.manager}: ${r.divisionTitle}% to win the ${r.division} division`,
                    }]
                  : []),
                { text: r.projectedWins.toFixed(1), t: null, title: `Currently ${r.record}` },
              ],
            }))}
          />
        </Panel>
      </div>
    </div>
  )
}
