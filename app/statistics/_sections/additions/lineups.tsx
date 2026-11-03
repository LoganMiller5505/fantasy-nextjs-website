"use client"

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { createColumnHelper } from "@tanstack/react-table"
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "../../_components/data-table"
import { type DataTableFeatures } from "../../_components/data-table-features"
import { emphasis } from "../../_components/highlight"
import { scopeLabel, when } from "../../_components/scope"
import { SortableHeader, numeric } from "../../_components/table-helpers"
import { Chart, HeatTable, ManagerLink, Panel, SERIES, Section, SimpleTable, StatTile, TileGrid, diverging, fmt } from "../../_components/ui"
import type { LineupsTabData } from "../../_lib/espn/additions"
import type { DeadStartRow, LineupRow, VsEspnRow } from "../../_lib/espn/lineups"
import { sum, type Scope } from "../../_lib/stats"

const percent = (x: number) => `${(100 * x).toFixed(1)}%`
const signed = (x: number) => (x > 0 ? `+${x.toFixed(1)}` : x.toFixed(1))
const lineupHelper = createColumnHelper<DataTableFeatures, LineupRow>()
const lineupKeys = ["Weeks", "Started", "Optimal", "Efficiency", "Left/wk", "Bench/wk", "Perfect", "Lineup L"] as const
const lineupColumns = lineupHelper.columns([
  lineupHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Manager" />,
    enableHiding: false,
    filterFn: "excludes",
    cell: ({ getValue }) => <ManagerLink manager={String(getValue())} />,
  }),
  ...lineupKeys.map((key) =>
    lineupHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...numeric,
      ...(key === "Efficiency" && { cell: ({ getValue }) => percent(Number(getValue())) }),
      ...((key === "Started" || key === "Optimal") && { cell: ({ getValue }) => fmt(Number(getValue()), 1) }),
    })
  ),
])

const espnHelper = createColumnHelper<DataTableFeatures, VsEspnRow>()
const espnKeys = ["Weeks", "You/wk", "ESPN/wk", "+/- per wk", "Better", "Worse"] as const
const espnColumns = espnHelper.columns([
  espnHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Manager" />,
    enableHiding: false,
    filterFn: "excludes",
    cell: ({ getValue }) => <ManagerLink manager={String(getValue())} />,
  }),
  ...espnKeys.map((key) =>
    espnHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...numeric,
      ...(key === "+/- per wk" && { cell: ({ getValue }) => signed(Number(getValue())) }),
    })
  ),
])

const deadHelper = createColumnHelper<DataTableFeatures, DeadStartRow>()
const deadColumns = deadHelper.columns([
  deadHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Manager" />,
    enableHiding: false,
    filterFn: "excludes",
    cell: ({ getValue }) => <ManagerLink manager={String(getValue())} />,
  }),
  ...(["Dead starts", "Cost"] as const).map((key) =>
    deadHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...numeric,
      ...(key === "Cost" && { cell: ({ getValue }) => fmt(Number(getValue()), 1) }),
    })
  ),
])

const config = { left: { label: "Left on the bench per week", theme: SERIES.blue } } satisfies ChartConfig

// The lineup calls each week: how close each manager came to their best lineup, the worst single
// calls, how the lineups set compare with what ESPN's projections would have set, and when in the
// week the points come
export function LineupsSections({ data, scope, highlighted }: { data: LineupsTabData; scope: Scope; highlighted: string | null }) {
  const { efficiency, blunders, dead, vsEspn, slots } = data
  // Each column's full colour is its biggest gap from the league average
  const slotLimits = slots.columns.map((_, i) => Math.max(...slots.rows.map((r) => Math.abs(r.values[i] - slots.average[i]))))
  const chart = [...efficiency].sort((a, b) => b["Left/wk"] - a["Left/wk"])
  const best = efficiency[0]
  const lineupLosses = sum(efficiency.map((r) => r["Lineup L"]))
  const mostLost = [...efficiency].sort((a, b) => b["Lineup L"] - a["Lineup L"])[0]

  return (
    <>
      <Section title="Lineups" description="How close each manager came to starting their best possible lineup.">
        <TileGrid>
          <StatTile
            label="League lineup efficiency"
            value={percent(sum(efficiency.map((r) => r.Started)) / (sum(efficiency.map((r) => r.Optimal)) || 1))}
            detail="Of the points the best possible lineups would have scored"
          />
          <StatTile label="Best lineup setter" value={best.player} detail={`${percent(best.Efficiency)} efficient, ${best.Perfect} perfect weeks`} />
          <StatTile label="Most left on the bench" value={chart[0].player} detail={`${fmt(chart[0]["Left/wk"], 1)} points a week below their best lineup`} />
          <StatTile
            label="Losses to lineup calls"
            value={lineupLosses}
            detail={mostLost["Lineup L"] ? `Most: ${mostLost.player} (${mostLost["Lineup L"]})` : "None yet"}
          />
        </TileGrid>
        <Panel
          title={`Points left on the bench · ${scopeLabel(scope)}`}
          description="How far each manager's lineup fell short of their best possible one, per week."
          method="The best lineup fills each slot (QB, 2 RB, 2 WR, TE, D/ST, K) with the highest scorers on the roster that week, then FLEX with the best RB, WR or TE left. Players on IR can't start. In a two-week matchup each week's lineup counts. Regular season only."
        >
          <Chart config={config} className="aspect-auto w-full" style={{ height: chart.length * 30 + 40 }}>
            <BarChart data={chart} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="player" tickLine={false} axisLine={false} width={72} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(v) => `${fmt(Number(v), 1)} points a week`} />} />
              <Bar dataKey="Left/wk" name="left" radius={4}>
                {chart.map((r) => (
                  <Cell key={r.player} fill="var(--color-left)" fillOpacity={emphasis(r.player, highlighted)} />
                ))}
              </Bar>
            </BarChart>
          </Chart>
        </Panel>
        <Panel
          title="Lineup efficiency"
          description="Points started against the best lineup each roster allowed."
          method="Efficiency is points started over the best lineup's points. Perfect: weeks the lineup was already the best one. Lineup L: losses the best lineup would have won, against the opponent's actual score. Bench/wk counts everyone on the bench, whether or not they'd have started."
        >
          <DataTable
            columns={lineupColumns}
            data={efficiency}
            initialSorting={[{ id: "Efficiency", desc: true }]}
            highlight={(r) => r.player === highlighted}
            phoneHidden={["Started", "Optimal", "Bench/wk"]}
          />
        </Panel>
      </Section>
      <Section title="Bench calls">
        <Panel
          title="Costliest bench calls"
          description="The biggest gaps between a benched player and a starter he could have replaced."
          method="For each week, the one swap of a bench player into a starting slot he was eligible for (his position, or FLEX for an RB, WR or TE) that would have added the most points."
        >
          {blunders.length ? (
            <SimpleTable
              head={["Week", "Manager", "Benched", "Started", "Cost", "Lost the game?"]}
              align={["left", "left", "left", "left", "right", "left"]}
              highlight={(i) => blunders[i].manager === highlighted}
              rows={blunders.map((b) => [
                when(scope, b.year, b.short),
                b.manager,
                `${b.benched.name} (${fmt(b.benched.points, 1)})`,
                `${b.started.name} (${fmt(b.started.points, 1)})`,
                fmt(b.gain, 1),
                b.flipped ? `Yes, to ${b.opponent}` : "",
              ])}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No closed weeks yet.</p>
          )}
        </Panel>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Panel
            title="Dead starts"
            description="Starters who were never going to score: on bye, ruled out, or with no game."
            method="A dead start is a starter ESPN projected for zero when lineups locked (a bye or a player ruled out), or one whose team had no game. Cost is what the best bench player who could have taken the slot scored instead."
          >
            <DataTable columns={deadColumns} data={dead.rows} initialSorting={[{ id: "Dead starts", desc: true }]} highlight={(r) => r.player === highlighted} />
          </Panel>
          <Panel title="The costliest ones" description="Dead starts by what the best bench option would have added.">
            {dead.worst.length ? (
              <SimpleTable
                head={["Week", "Manager", "Started", "Bench option", "Cost", "Lost?"]}
                align={["left", "left", "left", "left", "right", "left"]}
                highlight={(i) => dead.worst[i].manager === highlighted}
                rows={dead.worst.map((d) => [
                  when(scope, d.year, d.short),
                  d.manager,
                  `${d.name} (${d.slot})`,
                  d.replacement ? `${d.replacement.name} (${fmt(d.replacement.points, 1)})` : "—",
                  fmt(d.cost, 1),
                  d.lost ? "Yes" : "",
                ])}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No dead starts in this span.</p>
            )}
          </Panel>
        </div>
      </Section>
      <Section title="Against ESPN's lineup" description="Would following ESPN's projections have done better than the lineups managers set?">
        <Panel
          title="You against ESPN"
          description="Each manager's lineups against the ones ESPN's projections would have set from the same rosters, both scored on what the players actually did."
          method="ESPN's lineup fills each slot with the players projected to score most, by the same rules as the best lineup. Better and Worse count the weeks a manager's lineup outscored it, or fell short. Regular season only."
        >
          <DataTable columns={espnColumns} data={vsEspn} initialSorting={[{ id: "+/- per wk", desc: true }]} highlight={(r) => r.player === highlighted} />
        </Panel>
      </Section>
      <Section title="When the points come">
        <Panel
          title="Points by kickoff slot"
          description="The share of each manager's starter points from each kickoff slot. Blue is above the league average, red below."
          method="Each starter's points go to the kickoff of his NFL game that week, in Eastern time: Sunday early is before 3pm (London games included), Sunday late before 7pm, Sunday night after. Other is Friday and Saturday games. Regular season only."
        >
          <HeatTable
            corner="Manager"
            columns={slots.columns}
            highlight={(m) => m === highlighted}
            rows={slots.rows.map((r) => ({
              key: r.manager,
              label: r.manager,
              cells: r.values.map((v, i) => ({
                text: `${fmt(v, 1)}%`,
                ...diverging(v - slots.average[i], slotLimits[i]),
                title: `${r.manager}: ${fmt(v, 1)}% of points from ${slots.columns[i]} games (league average ${fmt(slots.average[i], 1)}%)`,
              })),
            }))}
          />
        </Panel>
      </Section>
    </>
  )
}
