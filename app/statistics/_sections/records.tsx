"use client"

import { HighlightPicker, useHighlight } from "../_components/highlight"
import { Toolbar } from "../_components/scope"
import { Section } from "../_components/ui"
import type { recordBook, seasonRecords } from "../_lib/stats"
import { SeasonRecords, SingleGames, Streaks } from "./record-book"

// The league's record book: single games, whole seasons, then streaks. Careers live on Managers.
export function RecordsView({
  book,
  seasons,
  managers,
}: {
  book: ReturnType<typeof recordBook>
  seasons: ReturnType<typeof seasonRecords>
  managers: string[]
}) {
  const [highlighted, setHighlighted] = useHighlight(managers)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} />
      </Toolbar>
      <Section title="Single games" description="All-time. Double weeks, which cover two NFL weeks, are left out.">
        <SingleGames book={book} highlighted={highlighted} />
      </Section>
      {seasons && (
        <Section title="Seasons" description="Seasons whose regular season is over. Records and luck are regular season; points are per game, playoffs included, as on Scoring.">
          <SeasonRecords records={seasons} />
        </Section>
      )}
      <Section title="Streaks" description="Across seasons, playoffs included. Hot and cold needs 10 games.">
        <Streaks book={book} highlighted={highlighted} />
      </Section>
    </div>
  )
}
