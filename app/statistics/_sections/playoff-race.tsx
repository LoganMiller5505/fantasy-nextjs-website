"use client"

import { emphasis } from "../_components/highlight"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { playoffRace } from "../_lib/playoff-race"
import { HeatTable, HighlightLines, Legend, PICK_HINT, Panel, SERIES, highlightLegend } from "../_components/ui"

type Race = ReturnType<typeof playoffRace>

const config = { playoffs: { label: "Playoff odds", theme: SERIES.blue } } satisfies ChartConfig
// Odds as whole percents, with "<1%" for anything that's possible but rounds to nothing
const odds = (p: number) => (p >= 0.5 ? `${Math.round(p)}%` : p > 0 ? "<1%" : "0%")
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`

export function PlayoffRace({ race, highlighted }: { race: NonNullable<Race>; highlighted: string | null }) {
  const seeding =
    race.divisionSeeds > 0
      ? `The ${race.divisionSeeds} division winners (best record, then points for) take seeds 1–${race.divisionSeeds}; the rest go to the best remaining records, with points for breaking ties.`
      : "Seeds go to the best records, with points for breaking ties."

  return (
    <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={`Playoff odds, ${race.year}`}
          description={`Chance of finishing in one of the ${race.spots} playoff spots, with ${race.weeksLeft} regular-season weeks left.`}
          method={`The rest of the season is played out ${race.runs.toLocaleString("en-US")} times. Each manager's simulated scores blend their own scores this season with the league's: early on they lean on the league, and by week six it's half and half. Each run also allows for not knowing how good a team really is, and that allowance shrinks as weeks are played, so one big week can't make anyone a lock. ${seeding}`}
        >
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height: race.rows.length * 30 + 40 }}>
            <BarChart data={race.rows} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 40 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="manager" tickLine={false} axisLine={false} width={72} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(v, _, item) => `${odds(Number(v))} · ${item.payload.record} now, ~${item.payload.projectedWins} wins projected`}
                  />
                }
              />
              <Bar dataKey="playoffs" fill="var(--color-playoffs)" radius={[0, 4, 4, 0]}>
                {race.rows.map((r) => (
                  <Cell key={r.manager} fillOpacity={emphasis(r.manager, highlighted)} />
                ))}
                <LabelList dataKey="playoffs" position="right" formatter={(v) => odds(Number(v))} className="fill-foreground" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </Panel>
        <Panel
          title="Where they finish"
          description="Chance of each final seed and of winning the division; darker is likelier."
          method={`From the same simulations as the playoff odds. ${seeding} Clinched and eliminated only show once they're certain, so they can lag behind the odds.`}
        >
          <HeatTable
            corner="Manager"
            highlight={(m) => m === highlighted}
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
                  text: p > 0 ? odds(p) : "",
                  t: p / 100,
                  title: `${r.manager}: ${odds(p)} to finish ${ordinal(i + 1)}`,
                })),
                { text: odds(r.missed), t: null, title: `${r.manager}: ${odds(r.missed)} to miss the playoffs` },
                ...(race.divisionSeeds
                  ? [{
                      text: r.divisionTitle > 0 ? odds(r.divisionTitle) : "",
                      t: r.divisionTitle / 100,
                      title: `${r.manager}: ${odds(r.divisionTitle)} to win the ${r.division} division`,
                    }]
                  : []),
                { text: r.projectedWins.toFixed(1), t: null, title: `${r.manager}: ~${r.projectedWins.toFixed(1)} wins projected, ${r.record} now` },
              ],
            }))}
          />
        </Panel>
    </div>
  )
}

const PERCENT_TICKS = [0, 25, 50, 75, 100]

// Playoff odds as they stood after each week, one line per manager
export function PlayoffOddsByWeek({
  race,
  highlighted,
}: {
  race: NonNullable<Race>
  highlighted: string | null
}) {
  return (
    <Panel
      title="Playoff odds by week"
      description={`Each manager's chance of a playoff spot after every week of ${race.year} so far.`}
      method="Each point reruns the simulation using only what was known after that week: later games count as unplayed, and the model only sees scores up to then. Early weeks lean heavily on the league average, so expect them to sit closer to the middle."
    >
      <HighlightLines
        data={race.playoffsByWeek}
        xKey="week"
        managers={race.rows.map((r) => r.manager)}
        highlighted={highlighted}
        domain={[0, 100]}
        ticks={PERCENT_TICKS}
        format={odds}
      />
      <Legend items={highlightLegend(highlighted)} note={PICK_HINT} />
    </Panel>
  )
}

// Four series colours: a division's managers each get one, in name order
const LINE_COLORS = [SERIES.blue, SERIES.orange, SERIES.aqua, SERIES.red]

// Division-title odds after each week: one small chart per division, so only that division's
// managers share an axis
export function DivisionOddsByWeek({ race, highlighted }: { race: NonNullable<Race>; highlighted: string | null }) {
  return (
    <Panel
      title="Division odds by week"
      description={`Each manager's chance of winning their division after every week of ${race.year} so far.`}
      method="From the same week-by-week reruns as the playoff odds. The division winner is the best record in the division, then points for."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {race.divisions.map(({ division, managers }) => {
          const config = Object.fromEntries(
            managers.map((m, i) => [m, { label: m, theme: LINE_COLORS[i % LINE_COLORS.length] }])
          ) satisfies ChartConfig
          // Only the highlighted manager's own division steps back around them
          const picked = highlighted != null && managers.includes(highlighted) ? highlighted : null
          return (
            <div key={division} className="grid gap-2">
              <h4 className="text-sm font-medium">{division}</h4>
              <ChartContainer config={config} className="aspect-auto h-48 w-full">
                <LineChart data={race.divisionByWeek} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(w: string) => w.replace("After ", "")} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} ticks={PERCENT_TICKS} interval={0} tickFormatter={odds} width={40} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v, name) => `${name}: ${odds(Number(v))}`} />} />
                  {managers.map((m) => (
                    <Line
                      key={m}
                      dataKey={m}
                      type="linear"
                      stroke={`var(--color-${m})`}
                      strokeWidth={m === picked ? 3 : 2}
                      strokeOpacity={emphasis(m, picked)}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
              <Legend items={managers.map((m, i) => ({ label: m, color: LINE_COLORS[i % LINE_COLORS.length] }))} />
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
