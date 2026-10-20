"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Trophy } from "lucide-react"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { SeasonResult, playoffCounts } from "../stats"
import { Panel, SERIES, SimpleTable } from "../ui"

const config = {
  appearances: { label: "Playoff appearances", theme: SERIES.blue },
  titles: { label: "Titles", theme: SERIES.orange },
} satisfies ChartConfig

export function Champions({
  results,
  counts,
}: {
  results: SeasonResult[]
  counts: ReturnType<typeof playoffCounts>
}) {
  return (
    <div className="grid gap-4">
      <Panel
        title="Season by season"
        description="The final week is the final. The bracket is the top regular-season seeds; everyone else plays consolation games."
      >
        <SimpleTable
          head={["Season", "Champion", "Runner-up", "3rd", "Regular-season #1", "Most points"]}
          rows={results.map((r) => [
            r.year,
            r.inProgress ? (
              <span className="text-muted-foreground">In progress</span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium">
                <Trophy className="size-3.5" aria-hidden />
                {r.champion}
              </span>
            ),
            r.runnerUp ?? "—",
            r.third ?? "—",
            r.inProgress ? `${r.regularSeasonTop} (so far)` : r.regularSeasonTop,
            r.inProgress ? `${r.pointsLeader} (so far)` : r.pointsLeader,
          ])}
        />
      </Panel>
      <Panel title="Playoff appearances and titles" description="Seasons in the championship bracket, by manager.">
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
          <BarChart data={counts} barGap={2} margin={{ top: 8, right: 8, left: -20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="manager" tickLine={false} axisLine={false} interval={0} angle={-40} textAnchor="end" height={56} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} verticalAlign="top" itemSorter={null} />
            <Bar dataKey="appearances" fill="var(--color-appearances)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="titles" fill="var(--color-titles)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Panel>
    </div>
  )
}
