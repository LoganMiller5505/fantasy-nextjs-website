"use client"

import * as React from "react"
import { cn } from "cn"
import type { SeasonStory as Story, WeekResult } from "../stats"
import { Controls, HighlightLines, Legend, PICK_HINT, Panel, Picker, SERIES, SimpleTable, fmt } from "../ui"

function Chip({ result, label }: { result: WeekResult; label: string }) {
  const text = result === "bye" ? "–" : result ?? "·"
  return (
    <span
      title={`${label}: ${result === "bye" ? "no game" : result ?? "not played yet"}`}
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-[4px] text-[10px] font-semibold",
        result === "W" && "bg-foreground text-background",
        result === "L" && "bg-muted text-muted-foreground",
        (result === "bye" || result == null) && "text-muted-foreground/60"
      )}
    >
      {text}
    </span>
  )
}

export function SeasonStory({ stories }: { stories: Record<number, Story> }) {
  const years = Object.keys(stories).map(Number).sort((a, b) => b - a)
  const [year, setYear] = React.useState(years[0])
  const story = stories[year]
  const [picked, setPicked] = React.useState(story.standings[0].manager)
  const highlighted = story.managers.includes(picked) ? picked : story.standings[0].manager

  const controls = (
    <Controls>
      <Picker label="Season" value={year} options={years} onChange={setYear} />
      <Picker label="Manager" value={highlighted} options={story.managers} onChange={setPicked} />
    </Controls>
  )

  return (
    <div className="grid gap-4">
      {controls}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Race for the top" description={`Cumulative wins by week, ${year} regular season.`}>
          <HighlightLines
            data={story.cumulative}
            xKey="week"
            managers={story.managers}
            highlighted={highlighted}
            onPick={setPicked}
          />
          <Legend items={[{ label: highlighted, color: SERIES.blue }, { label: "Rest of the league", color: "muted" }]} note={PICK_HINT} />
        </Panel>
        <Panel title="Weekly score vs the league" description="Points each week against that week's league median.">
          <HighlightLines
            data={story.weeklyScores}
            xKey="week"
            managers={story.managers}
            highlighted={highlighted}
            onPick={setPicked}
            extra={{ key: "median", label: "League median" }}
          />
          <Legend
            items={[
              { label: highlighted, color: SERIES.blue },
              { label: "League median", color: SERIES.orange },
              { label: "Rest of the league", color: "muted" },
            ]}
            note={PICK_HINT}
          />
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Strong finish?"
          description="Regular-season PPG in each half of the season. The second half fills in as the season goes."
        >
          <SimpleTable
            head={["Manager", "1st half", "2nd half", "Change"]}
            align={["left", "right", "right", "right"]}
            highlight={(i) => story.halves[i].manager === highlighted}
            rows={story.halves.map((r) => [
              r.manager,
              r.first == null ? "—" : fmt(r.first, 1),
              r.second == null ? "—" : fmt(r.second, 1),
              r.change == null ? "—" : `${r.change > 0 ? "+" : ""}${fmt(r.change, 1)}`,
            ])}
          />
        </Panel>
        <Panel title="Weekly awards" description="Top score, low score and biggest win each week, playoffs and consolation games included.">
          <SimpleTable
            head={["Week", "Top score", "Low score", "Biggest win"]}
            align={["left", "left", "left", "left"]}
            rows={story.awards.map((a) => [
              a.week,
              `${a.top} ${fmt(a.topPf, 1)}`,
              `${a.low} ${fmt(a.lowPf, 1)}`,
              `${a.blowout} (+${fmt(a.margin, 1)})`,
            ])}
          />
        </Panel>
      </div>
      <Panel title="Standings" description="Regular-season record and points; every week of the season as W / L, playoffs and consolation games included. – is a bye, · is still to play.">
        <SimpleTable
          head={["#", "Manager", "W-L", "PF", "PA", "Weeks"]}
          align={["left", "left", "right", "right", "right", "left"]}
          highlight={(i) => story.standings[i].manager === highlighted}
          rows={story.standings.map((row, i) => [
            i + 1,
            row.manager,
            `${row.wins}-${row.losses}`,
            fmt(row.pf),
            fmt(row.pa),
            <div key="chips" className="flex gap-0.5">
              {row.results.map((r, w) => (
                <Chip key={w} result={r} label={story.weekLabels[w]} />
              ))}
            </div>,
          ])}
        />
      </Panel>
    </div>
  )
}
