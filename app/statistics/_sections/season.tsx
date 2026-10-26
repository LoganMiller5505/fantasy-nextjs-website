"use client"

import type { divisionStrength, divisions, SeasonStory } from "../_lib/stats"
import type { weeklyGrid } from "../_lib/more-stats"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { ScopeToggle, Toolbar, useScope } from "../_components/scope"
import { Section } from "../_components/ui"
import { DivisionHistory, DivisionMatchups } from "./divisions"
import { Standings, WeeklyAwards, WeeklyScores } from "./season-story"
import { WeeklyGrid } from "./weekly-grid"
import { YourWeek } from "./your-week"
import type { WeekSummary } from "../_lib/managers"

// The chosen season: where things stand (overall, then by division), the season week by week,
// then how the divisions did against each other, that season and every season. Other
// cross-season views live on Scoring, Managers and Records.
export function SeasonView({
  initialYear,
  years,
  stories,
  grids,
  divisionsBySeason,
  strength,
  summaries,
}: {
  initialYear: number
  years: number[]
  stories: Record<number, SeasonStory>
  grids: Record<number, ReturnType<typeof weeklyGrid>>
  divisionsBySeason: Record<number, ReturnType<typeof divisions>>
  strength: ReturnType<typeof divisionStrength>
  // This season's tiles for each manager; null once it's over
  summaries: Record<string, WeekSummary> | null
}) {
  const [year, setYear] = useScope(initialYear)
  const story = stories[year]
  const [highlighted, setHighlighted] = useHighlight(story.managers)
  const division = divisionsBySeason[year]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <ScopeToggle value={year} options={years} onChange={setYear} />
        <HighlightPicker managers={story.managers} value={highlighted} onChange={setHighlighted} end />
      </Toolbar>
      {highlighted && summaries?.[highlighted]?.year === year && <YourWeek manager={highlighted} summary={summaries[highlighted]} />}
      <Section title="Standings">
        <Standings story={story} divisions={division} highlighted={highlighted} />
      </Section>
      <Section title="Week by week">
        <WeeklyGrid grid={grids[year]} highlighted={highlighted} />
        <WeeklyScores story={story} highlighted={highlighted} />
        <WeeklyAwards story={story} highlighted={highlighted} />
      </Section>
      {(division || strength.winPct.length > 0) && (
        <Section title="Divisions" description={division ? undefined : `${year} had no divisions; these cover every season that did.`}>
          <DivisionMatchups data={division} year={year} />
          <DivisionHistory strength={strength} />
        </Section>
      )}
    </div>
  )
}
