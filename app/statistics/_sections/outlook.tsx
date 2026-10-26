"use client"

import type { playoffRace } from "../_lib/playoff-race"
import type { lookingAhead } from "../_lib/stats"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { Toolbar } from "../_components/scope"
import { Section } from "../_components/ui"
import { Matchups, RoadAhead } from "./looking-ahead"
import { DivisionOddsByWeek, PlayoffOddsByWeek, PlayoffRace } from "./playoff-race"

// Next week first, then where the season is heading: playoff odds now and how they've moved, then
// who has the harder run-in
export function OutlookView({
  ahead,
  race,
}: {
  ahead: NonNullable<ReturnType<typeof lookingAhead>>
  race: ReturnType<typeof playoffRace>
}) {
  const managers = ahead.schedule.map((s) => s.manager).sort()
  const [highlighted, setHighlighted] = useHighlight(managers)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} />
      </Toolbar>
      <Section title="Next week">
        <Matchups data={ahead} highlighted={highlighted} />
      </Section>
      {race && (
        <Section title="Playoff race">
          <PlayoffRace race={race} highlighted={highlighted} />
          {/* A trend needs at least two weeks */}
          {race.playoffsByWeek.length > 1 && (
            <>
              <PlayoffOddsByWeek race={race} highlighted={highlighted} />
              {race.divisions.length > 0 && <DivisionOddsByWeek race={race} highlighted={highlighted} />}
            </>
          )}
        </Section>
      )}
      <Section title="Run-in">
        <RoadAhead data={ahead} highlighted={highlighted} />
      </Section>
    </div>
  )
}
