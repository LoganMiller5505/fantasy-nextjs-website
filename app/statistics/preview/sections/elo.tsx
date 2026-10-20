"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import type { elo } from "../more-stats"
import { Controls, HighlightLines, Legend, PICK_HINT, Panel, Picker, SERIES, SimpleTable } from "../ui"

type Elo = ReturnType<typeof elo>

export function EloView({ data }: { data: Elo }) {
  const [picked, setPicked] = React.useState(data.rows[0].manager)

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground">
        One rating per manager that moves with every game: beating a higher-rated manager gains more than beating a
        lower-rated one. Everyone starts at 1500 and is pulled a third of the way back toward it each new season. With
        only a few seasons played, treat it as a rough guide.
      </p>
      <Panel
        title="Rating over time"
        description="After every week, all seasons. A line breaks where a manager wasn't in the league."
        action={
          <Controls>
            <Picker label="Manager" value={picked} options={data.managers} onChange={setPicked} />
          </Controls>
        }
      >
        <HighlightLines data={data.series} xKey="game" managers={data.managers} highlighted={picked} onPick={setPicked} />
        <Legend items={[{ label: picked, color: SERIES.blue }, { label: "Everyone else", color: "muted" }]} note={PICK_HINT} />
      </Panel>
      <Panel title="Ratings" description="Current managers first.">
        <SimpleTable
          head={["#", "Manager", "Rating", "Peak", "Low", ""]}
          align={["right", "left", "right", "right", "right", "left"]}
          highlight={(i) => data.rows[i].manager === picked}
          rows={data.rows.map((r, i) => [
            r.active ? i + 1 : "",
            r.manager,
            r.rating,
            r.peak,
            r.low,
            r.active ? null : <Badge variant="outline">Former</Badge>,
          ])}
        />
      </Panel>
    </div>
  )
}
