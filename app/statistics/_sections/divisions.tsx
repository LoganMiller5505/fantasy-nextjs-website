"use client"

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { divisionStrength, divisions } from "../_lib/stats"
import { Panel, SERIES, SimpleTable, fmt } from "../_components/ui"

type Divisions = ReturnType<typeof divisions>

// Each division keeps one colour on every chart
const DIVISION_COLORS: Record<string, { light: string; dark: string }> = {
  East: SERIES.blue,
  North: SERIES.orange,
  South: SERIES.aqua,
}
const divisionConfig = (names: string[]) =>
  Object.fromEntries(names.map((n) => [n, { label: n, theme: DIVISION_COLORS[n] ?? SERIES.blue }])) satisfies ChartConfig

function StrengthChart({ names, data, unit, zeroTo }: { names: string[]; data: Record<string, string | number>[]; unit?: string; zeroTo?: number }) {
  const strengthConfig = divisionConfig(names)
  return (
    <ChartContainer config={strengthConfig} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16 }} barGap={2}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="season" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} domain={[0, zeroTo ?? "auto"]} unit={unit} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} verticalAlign="top" itemSorter={null} />
        {names.map((n) => (
          <Bar key={n} dataKey={n} fill={`var(--color-${n})`} radius={[4, 4, 0, 0]} maxBarSize={40} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

// The season's three division tables. A season without divisions says so.
export function DivisionTables({ data, year, highlighted }: { data: Divisions; year: number; highlighted: string | null }) {
  if (!data) {
    return (
      <Panel title={`${year} divisions`}>
        <p className="text-muted-foreground">There were no divisions that season.</p>
      </Panel>
    )
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {data.tables.map(({ division, rows }) => (
        <Panel key={division} title={`${division}, ${year}`}>
          <SimpleTable
            head={["Manager", "W-L", "Div", "PF"]}
            align={["left", "right", "right", "right"]}
            highlight={(i) => rows[i].manager === highlighted}
            rows={rows.map((r) => [r.manager, `${r.wins}-${r.losses}`, r.divRecord, fmt(r.pf, 1)])}
          />
        </Panel>
      ))}
    </div>
  )
}

// How the divisions did against each other this season
export function DivisionMatchups({ data, year }: { data: Divisions; year: number }) {
  if (!data) return null
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={`Strongest division, ${year}`} description="Each division's win % in games against the other two.">
        <ChartContainer config={divisionConfig(data.names)} className="aspect-auto h-56 w-full">
          <BarChart data={data.interPct} margin={{ top: 20, right: 8, left: -16 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="division" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(v, _, item) => `${v}% (${item.payload.record})`} />}
            />
            <Bar dataKey="pct" name="Win % outside the division" radius={[4, 4, 0, 0]} maxBarSize={64}>
              {data.interPct.map((d) => (
                <Cell key={d.division} fill={`var(--color-${d.division})`} />
              ))}
              <LabelList dataKey="record" position="top" className="fill-muted-foreground" fontSize={11} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </Panel>
      <Panel title={`Division vs division, ${year}`} description="Row division's record against the column division.">
        <SimpleTable
          head={["", ...data.names]}
          align={["left", ...data.names.map(() => "right" as const)]}
          rows={data.matrix.map((r) => [
            <span key="d" className="font-medium">{r.division}</span>,
            ...data.names.map((n) => r.vs[n] ?? "—"),
          ])}
        />
      </Panel>
    </div>
  )
}

// Every season with divisions, side by side
export function DivisionHistory({ strength }: { strength: ReturnType<typeof divisionStrength> }) {
  if (!strength.winPct.length) return null
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Division strength by season" description="Each division's regular-season win % against the other divisions, every season.">
        <StrengthChart names={strength.names} data={strength.winPct} unit="%" zeroTo={100} />
      </Panel>
      <Panel title="Division scoring by season" description="Average weekly score of each division's managers, regular season, every season.">
        <StrengthChart names={strength.names} data={strength.ppg} />
      </Panel>
    </div>
  )
}
