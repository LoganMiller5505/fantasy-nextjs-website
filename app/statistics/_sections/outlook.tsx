"use client"

import * as React from "react"
import { cn } from "cn"
import type { Pick } from "../_lib/picks"
import type { Race } from "../_lib/playoff-race"
import type { lookingAhead } from "../_lib/stats"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { Toolbar } from "../_components/scope"
import { Section } from "../_components/ui"
import { Matchups, RoadAhead, type MatchupOdds } from "./looking-ahead"
import { PathTo } from "./path-to"
import { DivisionOddsByWeek, PlayoffOddsByWeek, PlayoffRace } from "./playoff-race"
import { useScenario, type Scenario } from "./use-scenario"
import { ScenarioBar, WhatIfPicker } from "./what-if-picker"

const matchupOdds = (race: { rows: Race["rows"] }): Record<string, MatchupOdds> =>
  Object.fromEntries(race.rows.map((r) => [r.manager, { playoffs: r.playoffs, next: r.next }]))

// The page's race with a what-if in: the scenario's odds and paths, and the trend charts gain a
// last "What if" point after the weeks played
function withScenario(race: Race, scenario: Scenario): Race {
  const point = (value: (r: Scenario["rows"][number]) => number) => ({
    week: "What if",
    ...Object.fromEntries(scenario.rows.map((r) => [r.manager, value(r)])),
  })
  return {
    ...scenario,
    playoffsByWeek: [...race.playoffsByWeek, point((r) => r.playoffs)],
    divisionByWeek: [...race.divisionByWeek, point((r) => r.divisionTitle)],
  }
}

// Next week first, then where the season is heading: playoff odds now, the paths to each outcome,
// how the odds have moved, then who has the harder run-in. The toolbar's what-if picks results for
// any of the remaining games, and everything from next week's odds to the paths is shown with them
// in; the odds now stay alongside for comparison.
export function OutlookView({
  ahead,
  race,
}: {
  ahead: NonNullable<ReturnType<typeof lookingAhead>>
  race: Race | null
}) {
  const managers = ahead.schedule.map((s) => s.manager).sort()
  const [highlighted, setHighlighted] = useHighlight(managers)
  const { picks, setPicks, active, pending, error, scenario } = useScenario(race)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const view = race && scenario ? withScenario(race, scenario) : race
  const baseline = active ? race : null

  // Path to…: the manager follows the highlight until one is picked there (or opened from the
  // "Where they finish" grid); a new highlight takes over again
  const [pathManager, setPathManager] = React.useState<string | null>(null)
  const [pathOutcome, setPathOutcome] = React.useState("playoffs")
  const [lastHighlight, setLastHighlight] = React.useState(highlighted)
  if (highlighted !== lastHighlight) {
    setLastHighlight(highlighted)
    setPathManager(null)
  }
  const paths = view?.paths || null
  const pathFor = pathManager ?? (highlighted && paths?.byManager[highlighted] ? highlighted : managers[0])
  // A grid cell opens that manager and outcome and scrolls up to it
  const openPath = (manager: string, outcome: string) => {
    setPathManager(manager)
    setPathOutcome(outcome)
    document.getElementById("path-to")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Next week's games, by home and away side, for picking from the matchup cards
  const games = race?.paths.games ?? []
  const firstWeek = games.length ? Math.min(...games.map((g) => Number(g.week.slice(1)))) : null
  const nextIndex = (home: string, away: string) => games.findIndex((g) => g.week === `W${firstWeek}` && g.home === home && g.away === away)
  const pickFor = (home: string, away: string): Pick => picks[nextIndex(home, away)] ?? null
  const onPick = (home: string, away: string, pick: Pick) => {
    const i = nextIndex(home, away)
    if (i >= 0) setPicks(picks.map((p, j) => (j === i ? pick : p)))
  }

  // While new odds are being worked out, the last ones stay up, dimmed
  const dim = cn("grid grid-cols-[minmax(0,1fr)] gap-8 transition-opacity", pending && "pointer-events-none opacity-60")

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar wrap={active}>
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} />
        {race && games.length > 0 && (
          <WhatIfPicker
            games={games}
            picks={picks}
            onChange={setPicks}
            highlighted={highlighted}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
          />
        )}
        {active && (
          <ScenarioBar
            games={games}
            picks={picks}
            pending={pending}
            error={error}
            onEdit={() => setPickerOpen(true)}
            onReset={() => setPicks(picks.map(() => null))}
          />
        )}
      </Toolbar>
      <div className={dim} aria-busy={pending}>
        <Section title="Next week">
          <Matchups
            data={ahead}
            highlighted={highlighted}
            odds={view ? matchupOdds(view) : undefined}
            baseline={baseline ? matchupOdds(baseline) : undefined}
            pick={race ? { of: pickFor, set: onPick } : undefined}
          />
        </Section>
        {view && (
          <Section title="Playoff race">
            <PlayoffRace race={view} baseline={baseline} highlighted={highlighted} onOpen={paths ? openPath : undefined} />
          </Section>
        )}
        {view && paths && (
          <Section title="Path to…">
            <PathTo
              paths={paths}
              baseline={baseline?.paths}
              picks={active ? picks : undefined}
              runs={view.runs}
              spots={view.spots}
              divisionSeeds={view.divisionSeeds}
              manager={pathFor}
              outcome={pathOutcome}
              onManager={setPathManager}
              onOutcome={setPathOutcome}
            />
          </Section>
        )}
        {/* A trend needs at least two weeks */}
        {view && view.playoffsByWeek.length > 1 && (
          <Section title="How the odds have moved">
            <PlayoffOddsByWeek race={view} highlighted={highlighted} onPick={setHighlighted} />
            {view.divisions.length > 0 && <DivisionOddsByWeek race={view} highlighted={highlighted} />}
          </Section>
        )}
        <Section title="Run-in">
          <RoadAhead data={ahead} highlighted={highlighted} />
        </Section>
      </div>
    </div>
  )
}
