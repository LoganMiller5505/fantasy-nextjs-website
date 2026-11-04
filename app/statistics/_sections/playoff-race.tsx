"use client"

import { emphasis } from "../_components/highlight"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { playoffRace } from "../_lib/playoff-race"
import { ordinal } from "../_lib/stats"
import { Chart, HeatTable, HighlightLines, Legend, PICK_HINT, Panel, SERIES, highlightLegend, oddsFmt as odds } from "../_components/ui"

type Race = ReturnType<typeof playoffRace>

const config = { playoffs: { label: "Playoff odds", theme: SERIES.blue } } satisfies ChartConfig

// `onOpen`: opens Path to… for a manager and outcome, from a tap on a bar or a grid cell
export function PlayoffRace({
  race,
  highlighted,
  onOpen,
}: {
  race: NonNullable<Race>
  highlighted: string | null
  onOpen?: (manager: string, outcome: string) => void
}) {
  const tap = onOpen ? " · tap for the paths" : ""
  const open = (manager: string, outcome: string) => (onOpen ? () => onOpen(manager, outcome) : undefined)
  const seeding =
    race.divisionSeeds > 0
      ? `The ${race.divisionSeeds} division winners (best record, then points for) take seeds 1–${race.divisionSeeds}; the rest go to the best remaining records, with points for breaking ties.`
      : "Seeds go to the best records, with points for breaking ties."

  return (
    // Stacked: the finishing-seed grid needs the full width to show every seed without scrolling
    <div className="grid gap-4">
        <Panel
          title={`Playoff odds, ${race.year}`}
          description={`Chance of finishing in one of the ${race.spots} playoff spots, with ${race.weeksLeft} regular-season weeks left.${onOpen ? " Tap a bar to see the paths there." : ""}`}
          method={`The rest of the season is played out ${race.runs.toLocaleString("en-US")} times. Each manager's simulated scores blend their own scores this season with the league's: early on they lean on the league, and by week six it's half and half. Each run also allows for not knowing how good a team really is, and that allowance shrinks as weeks are played, so one big week can't make anyone a lock. ${seeding} A 0% or 100% only shows once it's certain: every way the remaining games could go is checked first.`}
        >
          <Chart config={config} className="aspect-auto w-full" style={{ height: race.rows.length * 30 + 40 }}>
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
              <Bar
                dataKey="playoffs"
                fill="var(--color-playoffs)"
                radius={[0, 4, 4, 0]}
                className={onOpen ? "cursor-pointer" : undefined}
                onClick={onOpen ? (bar) => onOpen((bar.payload as { manager: string }).manager, "playoffs") : undefined}
              >
                {race.rows.map((r) => (
                  <Cell key={r.manager} fillOpacity={emphasis(r.manager, highlighted)} />
                ))}
                <LabelList dataKey="playoffs" position="right" formatter={(v) => odds(Number(v))} className="fill-foreground" fontSize={11} />
              </Bar>
            </BarChart>
          </Chart>
        </Panel>
        <Panel
          title="Where they finish"
          description={`Chance of each final seed and of winning the division; darker is likelier.${onOpen ? " Tap a cell to see the paths to it." : ""}`}
          method={`From the same simulations as the playoff odds. ${seeding} A 0% or 100% (blank cells included) only shows once it's certain: every way the remaining games could go is checked first, and anything short of certain shows as "<1%" or ">99%". Clinched and eliminated work the same way.`}
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
                  title: `${r.manager}: ${odds(p)} to finish ${ordinal(i + 1)}${tap}`,
                  onClick: open(r.manager, `seed-${i + 1}`),
                })),
                {
                  text: odds(r.missed),
                  t: null,
                  title: `${r.manager}: ${odds(r.missed)} to miss the playoffs${tap}`,
                  onClick: open(r.manager, "miss"),
                },
                ...(race.divisionSeeds
                  ? [{
                      text: r.divisionTitle > 0 ? odds(r.divisionTitle) : "",
                      t: r.divisionTitle / 100,
                      title: `${r.manager}: ${odds(r.divisionTitle)} to win the ${r.division} division${tap}`,
                      onClick: open(r.manager, "division"),
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
  onPick,
}: {
  race: NonNullable<Race>
  highlighted: string | null
  onPick: (manager: string) => void
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
        onPick={onPick}
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
            <div key={division} className="grid min-w-0 gap-2">
              <h4 className="text-sm font-medium">{division}</h4>
              <Chart config={config} className="aspect-auto h-48 w-full">
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
              </Chart>
              <Legend items={managers.map((m, i) => ({ label: m, color: LINE_COLORS[i % LINE_COLORS.length] }))} />
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
