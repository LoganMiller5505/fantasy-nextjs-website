"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { RankSource, powerRankings } from "../stats"
import { Controls, HighlightLines, Legend, PICK_HINT, Panel, Picker, SERIES, SimpleTable } from "../ui"

type Rankings = ReturnType<typeof powerRankings>

const sources: RankSource[] = ["Consensus", "Logan", "Andy", "ESPN"]
const config = { pct: { label: "Called correctly", theme: SERIES.blue } } satisfies ChartConfig

export function PowerRankings({ data }: { data: Rankings }) {
  const [source, setSource] = React.useState<RankSource>("Consensus")
  const [picked, setPicked] = React.useState(data.latestTable[0].manager)
  const maxSpread = Math.max(...data.latestTable.map((r) => r.spread))

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground">
        Ballots from Logan, Andy and ESPN, {data.year} weeks {data.weeks[0].slice(1)}–{data.weeks.at(-1)!.slice(1)}.
        Consensus is the average of all three ranks, with ties broken by the average of Andy&apos;s and Logan&apos;s.
      </p>
      <Controls>
        <Picker label="Ranker" value={source} options={sources} onChange={setSource} />
        <Picker label="Manager" value={picked} options={data.managers} onChange={setPicked} />
      </Controls>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Rank by week" description={`${source} ranking; #1 at the top.`}>
          <HighlightLines
            data={data.series[source]}
            xKey="week"
            managers={data.managers}
            highlighted={picked}
            onPick={setPicked}
            reversed
            domain={[1, data.managers.length]}
            ticks={[1, 4, 8, data.managers.length]}
          />
          <Legend items={[{ label: picked, color: SERIES.blue }, { label: "Rest of the league", color: "muted" }]} note={PICK_HINT} />
        </Panel>
        <Panel
          title="Who calls it best"
          description="Share of next-week games where the manager each ranker had higher actually won."
        >
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <BarChart data={data.accuracy} margin={{ top: 20, right: 8, left: -16 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="ranker" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={(v, _, item) => `${v}% (${item.payload.right} of ${item.payload.total})`} />}
              />
              <Bar dataKey="pct" fill="var(--color-pct)" radius={[4, 4, 0, 0]} maxBarSize={64}>
                <LabelList dataKey="pct" position="top" formatter={(v) => `${v}%`} className="fill-foreground" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </Panel>
      </div>
      <Panel title={`Latest ballots (${data.latest})`} description="Spread is the gap between the highest and lowest rank; the biggest disagreements are highlighted.">
        <SimpleTable
          head={["Consensus", "Manager", "Record", "Logan", "Andy", "ESPN", "Spread"]}
          align={["right", "left", "right", "right", "right", "right", "right"]}
          highlight={(i) => data.latestTable[i].spread === maxSpread}
          rows={data.latestTable.map((r) => [r.consensus, r.manager, r.record, r.Logan, r.Andy, r.ESPN, r.spread])}
        />
      </Panel>
    </div>
  )
}
