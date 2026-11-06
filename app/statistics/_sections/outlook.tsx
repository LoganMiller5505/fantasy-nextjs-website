"use client"

import * as React from "react"
import type { Race } from "../_lib/playoff-race"
import type { lookingAhead } from "../_lib/stats"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { Toolbar } from "../_components/scope"
import { Section } from "../_components/ui"
import { Matchups, RoadAhead } from "./looking-ahead"
import { PathTo } from "./path-to"
import { DivisionOddsByWeek, PlayoffOddsByWeek, PlayoffRace } from "./playoff-race"

// Next week first, then where the season is heading: playoff odds now, the paths to each outcome,
// how the odds have moved, then who has the harder run-in
export function OutlookView({
  ahead,
  race,
}: {
  ahead: NonNullable<ReturnType<typeof lookingAhead>>
  race: Race | null
}) {
  const managers = ahead.schedule.map((s) => s.manager).sort()
  const [highlighted, setHighlighted] = useHighlight(managers)

  // Path to…: the manager follows the highlight until one is picked there (or opened from the
  // "Where they finish" grid); a new highlight takes over again
  const [pathManager, setPathManager] = React.useState<string | null>(null)
  const [pathOutcome, setPathOutcome] = React.useState("playoffs")
  const [lastHighlight, setLastHighlight] = React.useState(highlighted)
  if (highlighted !== lastHighlight) {
    setLastHighlight(highlighted)
    setPathManager(null)
  }
  const paths = race?.paths || null
  const pathFor = pathManager ?? (highlighted && paths?.byManager[highlighted] ? highlighted : managers[0])
  // A grid cell opens that manager and outcome and scrolls up to it
  const openPath = (manager: string, outcome: string) => {
    setPathManager(manager)
    setPathOutcome(outcome)
    document.getElementById("path-to")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} />
      </Toolbar>
      <Section title="Next week">
        <Matchups data={ahead} highlighted={highlighted} odds={race ? Object.fromEntries(race.rows.map((r) => [r.manager, { playoffs: r.playoffs, next: r.next }])) : undefined} />
      </Section>
      {race && (
        <Section title="Playoff race">
          <PlayoffRace race={race} highlighted={highlighted} onOpen={paths ? openPath : undefined} />
        </Section>
      )}
      {race && paths && (
        <Section title="Path to…">
          <PathTo
            paths={paths}
            runs={race.runs}
            spots={race.spots}
            divisionSeeds={race.divisionSeeds}
            manager={pathFor}
            outcome={pathOutcome}
            onManager={setPathManager}
            onOutcome={setPathOutcome}
          />
        </Section>
      )}
      {/* A trend needs at least two weeks */}
      {race && race.playoffsByWeek.length > 1 && (
        <Section title="How the odds have moved">
          <PlayoffOddsByWeek race={race} highlighted={highlighted} onPick={setHighlighted} />
          {race.divisions.length > 0 && <DivisionOddsByWeek race={race} highlighted={highlighted} />}
        </Section>
      )}
      <Section title="Run-in">
        <RoadAhead data={ahead} highlighted={highlighted} />
      </Section>
    </div>
  )
}
