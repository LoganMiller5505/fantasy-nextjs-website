"use client"

import * as React from "react"
import type { RankSource, powerRankings } from "../_lib/stats"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { Segmented, Toolbar } from "../_components/scope"
import { HeatTable, HighlightLines, Legend, PICK_HINT, Panel, Section, SimpleTable, StatTile, diverging, highlightLegend } from "../_components/ui"

type Rankings = ReturnType<typeof powerRankings>

const sources: RankSource[] = ["Consensus", "Logan", "Andy", "ESPN"]

// The current ballots first, then how the rankings moved, then the rankers themselves
export function PowerRankings({ data }: { data: Rankings }) {
  const [source, setSource] = React.useState<RankSource>("Consensus")
  const [picked, setPicked] = useHighlight(data.managers)
  const maxSpread = Math.max(...data.latestTable.map((r) => r.spread))
  const biasLimit = Math.max(...data.bias.flatMap((r) => data.rankers.map((k) => Math.abs(r[k]))))
  const signed = (x: number) => (x > 0 ? `+${x}` : String(x))
  // Up is better: ↑2 is two places higher
  const arrow = (x: number | null) => (x == null ? "—" : x > 0 ? `↑${x}` : x < 0 ? `↓${-x}` : "–")

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <HighlightPicker managers={data.managers} value={picked} onChange={setPicked} />
      </Toolbar>
      <Section title="This week">
        <Panel
          title={`Latest ballots (${data.latest})`}
          description="Where Logan, Andy and ESPN rank everyone, against where they actually stand."
          method={`Ballots cover ${data.year} weeks ${data.weeks[0].slice(1)}–${data.weeks.at(-1)!.slice(1)}. Consensus is the average of all three ranks, with ties broken by the average of Andy's and Logan's. Spread is the gap between the highest and lowest rank; the biggest is in bold. Move is the change in consensus rank since the ballot before. Standing is where the manager actually sat after that week (wins, then points for); vs standing is how many places higher (↑) or lower (↓) the consensus ranks them than that.`}
        >
          <SimpleTable
            head={["Consensus", "Manager", "Move", "Record", "Logan", "Andy", "ESPN", "Spread", "Standing", "vs standing"]}
            align={["right", "left", "right", "right", "right", "right", "right", "right", "right", "right"]}
            highlight={(i) => data.latestTable[i].manager === picked}
            rows={data.latestTable.map((r) => [
              r.consensus,
              r.manager,
              arrow(r.move),
              r.record,
              r.Logan,
              r.Andy,
              r.ESPN,
              r.spread === maxSpread ? <span key="spread" className="font-semibold">{r.spread}</span> : r.spread,
              r.standing,
              arrow(r.standing - r.consensus),
            ])}
          />
        </Panel>
      </Section>
      <Section title="Movement">
        <Panel
          title="Rank by week"
          description="Each ballot's ranking; #1 at the top."
          controls={<Segmented label="Ranker" value={source} options={sources} onChange={setSource} size="sm" />}
        >
          <HighlightLines
            data={data.series[source]}
            xKey="week"
            managers={data.managers}
            highlighted={picked}
            reversed
            startLabels
            domain={[1, data.managers.length]}
            ticks={[1, 4, 8, data.managers.length]}
          />
          <Legend items={highlightLegend(picked)} note={PICK_HINT} />
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Biggest risers" description="Largest jumps in the consensus from one ballot to the next.">
            <SimpleTable
              head={["Manager", "Ballots", "Move"]}
              align={["left", "left", "right"]}
              highlight={(i) => data.risers[i].manager === picked}
              rows={data.risers.map((m) => [m.manager, m.week, `${m.from} → ${m.to} (+${m.change})`])}
            />
          </Panel>
          <Panel title="Biggest fallers" description="Largest drops in the consensus from one ballot to the next.">
            <SimpleTable
              head={["Manager", "Ballots", "Move"]}
              align={["left", "left", "right"]}
              highlight={(i) => data.fallers[i].manager === picked}
              rows={data.fallers.map((m) => [m.manager, m.week, `${m.from} → ${m.to} (${m.change})`])}
            />
          </Panel>
        </div>
      </Section>
      <Section title="The rankers" description="Who calls it best: the share of the next week's games where the manager each ranker had higher actually won.">
        {/* Centred, so a tile left over on a narrower screen sits in the middle */}
        <div className="flex flex-wrap justify-center gap-3">
          {data.accuracy.map((a) => (
            <div key={a.ranker} className="basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-1.5rem)/3)]">
              <StatTile label={a.ranker} value={`${a.pct.toFixed(1)}%`} detail={`${a.right} of ${a.total} games called right`} />
            </div>
          ))}
        </div>
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
      </Section>
    </div>
  )
}
