"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { divisionStrength, divisions } from "../stats"
import { Controls, Panel, Picker, SERIES, SimpleTable, fmt } from "../ui"

type Divisions = ReturnType<typeof divisions>

const config = { pct: { label: "Win % outside the division", theme: SERIES.blue } } satisfies ChartConfig
// Divisions take categorical slots in alphabetical order, so each keeps its colour across charts
const DIVISION_COLORS = [SERIES.blue, SERIES.orange, SERIES.aqua]

function StrengthChart({ names, data, unit, zeroTo }: { names: string[]; data: Record<string, string | number>[]; unit?: string; zeroTo?: number }) {
  const strengthConfig = Object.fromEntries(
    names.map((n, i) => [n, { label: n, theme: DIVISION_COLORS[i % DIVISION_COLORS.length] }])
  ) satisfies ChartConfig
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

export function DivisionsView({
  bySeason,
  strength,
}: {
  bySeason: Record<number, Divisions>
  strength: ReturnType<typeof divisionStrength>
}) {
  const years = Object.keys(bySeason).map(Number).sort((a, b) => b - a)
  const [year, setYear] = React.useState(years[0])
  const data = bySeason[year]

  return (
    <div className="grid gap-4">
      <Controls>
        <Picker label="Season" value={year} options={years} onChange={setYear} />
      </Controls>
      {!data ? (
        <Panel title={`${year}`}>
          <p className="text-muted-foreground">There were no divisions that season.</p>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {data.tables.map(({ division, rows }) => (
              <Panel key={division} title={division}>
                <SimpleTable
                  head={["Manager", "W-L", "Div", "PF"]}
                  align={["left", "right", "right", "right"]}
                  rows={rows.map((r) => [r.manager, `${r.wins}-${r.losses}`, r.divRecord, fmt(r.pf, 1)])}
                />
              </Panel>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Strongest division" description="Each division's win % in games against the other two.">
              <ChartContainer config={config} className="aspect-auto h-56 w-full">
                <BarChart data={data.interPct} margin={{ top: 20, right: 8, left: -16 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="division" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(v, _, item) => `${v}% (${item.payload.record})`} />}
                  />
                  <Bar dataKey="pct" fill="var(--color-pct)" radius={[4, 4, 0, 0]} maxBarSize={64}>
                    <LabelList dataKey="record" position="top" className="fill-muted-foreground" fontSize={11} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </Panel>
            <Panel title="Division vs division" description="Row division's record against the column division.">
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
        </>
      )}
      {strength.winPct.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Division strength by season" description="Each division's regular-season win % against the other divisions.">
            <StrengthChart names={strength.names} data={strength.winPct} unit="%" zeroTo={100} />
          </Panel>
          <Panel title="Division scoring by season" description="Average weekly score of each division's managers, regular season.">
            <StrengthChart names={strength.names} data={strength.ppg} />
          </Panel>
        </div>
      )}
    </div>
  )
}
