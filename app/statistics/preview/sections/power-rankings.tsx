"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { RankSource, powerRankings } from "../stats"
import { Controls, HeatTable, HighlightLines, Legend, PICK_HINT, Panel, Picker, SERIES, SimpleTable, diverging } from "../ui"

type Rankings = ReturnType<typeof powerRankings>

const sources: RankSource[] = ["Consensus", "Logan", "Andy", "ESPN"]
const config = { pct: { label: "Called correctly", theme: SERIES.blue } } satisfies ChartConfig

export function PowerRankings({ data }: { data: Rankings }) {
  const [source, setSource] = React.useState<RankSource>("Consensus")
  const [picked, setPicked] = React.useState(data.latestTable[0].manager)
  const maxSpread = Math.max(...data.latestTable.map((r) => r.spread))
  const biasLimit = Math.max(...data.bias.flatMap((r) => data.rankers.map((k) => Math.abs(r[k]))))
  const signed = (x: number) => (x > 0 ? `+${x}` : String(x))

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
      <Panel
        title={`Latest ballots (${data.latest})`}
        description="Spread is the gap between the highest and lowest rank; the biggest disagreements are highlighted. Standing is where the manager actually sat after that week (wins, then points for)."
      >
        <SimpleTable
          head={["Consensus", "Manager", "Record", "Logan", "Andy", "ESPN", "Spread", "Standing", "Ranked vs standing"]}
          align={["right", "left", "right", "right", "right", "right", "right", "right", "right"]}
          highlight={(i) => data.latestTable[i].spread === maxSpread}
          rows={data.latestTable.map((r) => [
            r.consensus,
            r.manager,
            r.record,
            r.Logan,
            r.Andy,
            r.ESPN,
            r.spread,
            r.standing,
            r.standing === r.consensus ? "Same" : r.standing > r.consensus ? `${r.standing - r.consensus} above` : `${r.consensus - r.standing} below`,
          ])}
        />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Who rates whom"
          description="How many spots higher (blue, +) or lower (red, −) each ranker puts a manager than the consensus does, averaged over every ballot."
        >
          <HeatTable
            corner="Manager"
            columns={data.rankers}
            highlight={(m) => m === picked}
            rows={data.bias.map((r) => ({
              key: r.manager,
              label: r.manager,
              cells: data.rankers.map((k) => ({
                text: signed(r[k]),
                ...diverging(r[k], biasLimit),
                title: `${k} ranks ${r.manager} ${Math.abs(r[k])} spots ${r[k] >= 0 ? "higher" : "lower"} than the consensus on average`,
              })),
            }))}
          />
        </Panel>
        <div className="grid content-start gap-4">
          <Panel title="Biggest risers" description="Largest jumps in the consensus from one ballot to the next.">
            <SimpleTable
              head={["Manager", "Ballots", "Move"]}
              align={["left", "left", "right"]}
              rows={data.risers.map((m) => [m.manager, m.week, `${m.from} → ${m.to} (+${m.change})`])}
            />
          </Panel>
          <Panel title="Biggest fallers">
            <SimpleTable
              head={["Manager", "Ballots", "Move"]}
              align={["left", "left", "right"]}
              rows={data.fallers.map((m) => [m.manager, m.week, `${m.from} → ${m.to} (${m.change})`])}
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}
