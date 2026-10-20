"use client"

import * as React from "react"
import { Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { careers } from "../stats"
import { Controls, HeatTable, HighlightLines, Legend, PICK_HINT, Panel, Picker, SERIES, SimpleTable, fmt } from "../ui"

type Careers = ReturnType<typeof careers>

export function CareersView({ data }: { data: Careers }) {
  const [picked, setPicked] = React.useState("Logan")

  return (
    <div className="grid gap-4">
      <Panel
        title="Win % by season"
        description="Every manager who has played; a line stops where a manager wasn't in the league."
        action={
          <Controls>
            <Picker label="Manager" value={picked} options={data.managers} onChange={setPicked} />
          </Controls>
        }
      >
        <HighlightLines
          data={data.winPctBySeason}
          xKey="season"
          managers={data.managers}
          highlighted={picked}
          onPick={setPicked}
          domain={[0, 100]}
          unit="%"
        />
        <Legend items={[{ label: picked, color: SERIES.blue }, { label: "Everyone else", color: "muted" }]} note={PICK_HINT} />
      </Panel>
      <Panel
        title="Scoring by season, ranked"
        description="Each season's PPG as a percentile of that season's managers: 100 is the season's best scorer, 0 the worst. That puts 10- and 12-team seasons on the same scale. Double weeks are left out."
      >
        <HeatTable
          corner="Manager"
          columns={data.years.map(String)}
          highlight={(m) => m === picked}
          rows={data.managers.map((m) => ({
            key: m,
            label: m,
            cells: data.years.map((y) => {
              const c = data.ppgPercentile[m]?.[y]
              return c
                ? { text: c.pct, t: c.pct / 100, title: `${m}, ${y}: ${fmt(c.ppg, 1)} PPG, #${c.rank} of ${c.of}` }
                : { text: "", t: null, title: `${m} wasn't in the league in ${y}` }
            }),
          }))}
        />
      </Panel>
      <Panel title="Careers" description="Records include playoffs. Former managers aren't on the latest roster.">
        <SimpleTable
          head={["Manager", "Seasons", ...data.years.map(String), "Career", "Win %", "Playoffs", "Titles", ""]}
          align={["left", "left", ...data.years.map(() => "right" as const), "right", "right", "right", "right", "left"]}
          highlight={(i) => data.rows[i].manager === picked}
          rows={data.rows.map((r) => [
            r.manager,
            r.span,
            ...data.years.map((y) => r.bySeason[y] ?? <span key={y} className="text-muted-foreground">—</span>),
            r.career,
            r.pct.toFixed(3),
            r.playoffs,
            r.titles ? (
              <span className="inline-flex items-center gap-1">
                <Trophy className="size-3.5" aria-hidden />
                {r.titles}
              </span>
            ) : 0,
            r.active ? null : <Badge variant="outline">Former</Badge>,
          ])}
        />
      </Panel>
    </div>
  )
}
