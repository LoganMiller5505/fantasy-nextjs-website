"use client"

import * as React from "react"
import { Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { careers } from "../stats"
import { Controls, HighlightLines, Legend, Panel, Picker, SERIES, SimpleTable } from "../ui"

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
          domain={[0, 100]}
          unit="%"
        />
        <Legend items={[{ label: picked, color: SERIES.blue }, { label: "Everyone else", color: "muted" }]} />
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
