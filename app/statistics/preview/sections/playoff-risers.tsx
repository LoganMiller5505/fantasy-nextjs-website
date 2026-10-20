"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { playoffRisers } from "../stats"
import { Panel, SERIES, SimpleTable, fmt } from "../ui"

const riserConfig = {
  regular: { label: "Regular season PPG", theme: SERIES.blue },
  playoffs: { label: "Playoff-week PPG", theme: SERIES.orange },
} satisfies ChartConfig

export function PlayoffRisers({ risers }: { risers: ReturnType<typeof playoffRisers> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Who rises in the playoffs"
        description="Regular-season PPG against PPG in playoff weeks, consolation games included. Double-week points are halved so every week counts once."
      >
        <ChartContainer config={riserConfig} className="aspect-auto w-full" style={{ height: risers.length * 34 + 60 }}>
          <BarChart data={risers} layout="vertical" barGap={2} barCategoryGap={6} margin={{ left: 8, right: 12 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="manager" tickLine={false} axisLine={false} width={72} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} verticalAlign="top" itemSorter={null} />
            <Bar dataKey="regular" fill="var(--color-regular)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="playoffs" fill="var(--color-playoffs)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </Panel>
      <Panel title="Playoff change" description="Biggest risers first. Weeks is the number of playoff weeks played.">
        <SimpleTable
          head={["Manager", "Regular", "Playoffs", "Change", "Weeks"]}
          align={["left", "right", "right", "right", "right"]}
          rows={risers.map((r) => [r.manager, fmt(r.regular, 1), fmt(r.playoffs, 1), `${r.change > 0 ? "+" : ""}${fmt(r.change, 1)}`, r.weeks])}
        />
      </Panel>
    </div>
  )
}
