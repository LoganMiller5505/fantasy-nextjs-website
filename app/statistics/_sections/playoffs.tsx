"use client"

import type { brackets } from "../_lib/more-stats"
import type { playoffHeadlines, ResumeRow, seedTable } from "../_lib/playoffs"
import Link from "next/link"
import type { SeasonResult, playoffRisers } from "../_lib/stats"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { Toolbar } from "../_components/scope"
import { Section, StatTile, TileGrid, fmt } from "../_components/ui"
import { Brackets } from "./brackets"
import { Champions } from "./champions"
import { PlayoffResumes, SeedsAndUpsets } from "./playoff-history"
import { PlayoffRisers } from "./playoff-risers"

const names = (ms: string[]) => ms.join(", ")

// Everything about the playoffs: past champions and brackets, and how each manager has done once
// the regular season ends. This season's race is on the outlook page.
export function Playoffs({
  top,
  results,
  seasons,
  inProgress,
  resumes,
  seeds,
  years,
  risers,
}: {
  top: ReturnType<typeof playoffHeadlines>
  results: SeasonResult[]
  seasons: ReturnType<typeof brackets>
  inProgress: number | null
  resumes: ResumeRow[]
  seeds: ReturnType<typeof seedTable>
  years: number[]
  risers: ReturnType<typeof playoffRisers>
}) {
  const managers = resumes.map((r) => r.player)
  const [highlighted, setHighlighted] = useHighlight(managers)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <HighlightPicker managers={managers} value={highlighted} onChange={setHighlighted} />
      </Toolbar>
      <TileGrid wide={3}>
        <StatTile label="Most titles" value={top.mostTitles.count} detail={names(top.mostTitles.managers)} />
        <StatTile label="Most appearances" value={top.mostApps.count} detail={names(top.mostApps.managers)} />
        {top.bestRecord && (
          <StatTile
            label="Best bracket record"
            value={top.bestRecord["Bracket W-L"]}
            detail={`${top.bestRecord.player}, ${top.bestRecord.Apps} appearance${top.bestRecord.Apps === 1 ? "" : "s"}`}
          />
        )}
        {top.biggestUpset && (
          <StatTile
            label="Biggest upset"
            value={`${top.biggestUpset.winnerSeed} over ${top.biggestUpset.loserSeed}`}
            detail={`${top.biggestUpset.winner} beat ${top.biggestUpset.loser}, ${top.biggestUpset.year} ${top.biggestUpset.round}`}
          />
        )}
        <StatTile
          label="Closest bracket game"
          value={`+${fmt(top.closest.margin)}`}
          detail={`${top.closest.winner} over ${top.closest.loser}, ${top.closest.year} ${top.closest.round}`}
        />
        {top.drought.length > 0 && (
          <StatTile
            label="Longest active drought"
            value={`${top.drought[0].length} season${top.drought[0].length === 1 ? "" : "s"}`}
            detail={`${names(top.drought.map((d) => d.manager))}, without a playoff spot`}
          />
        )}
      </TileGrid>

      <Section
        title="Champions"
        description={
          <>
            Every finished season&apos;s results. This season&apos;s playoff odds are on{" "}
            <Link href="/statistics/outlook" className="link">
              Outlook
            </Link>
            .
          </>
        }
      >
        <Champions results={results} />
      </Section>

      <Section title="Brackets">
        <Brackets seasons={seasons} inProgress={inProgress} highlighted={highlighted} />
      </Section>

      <Section title="Playoff performance">
        <PlayoffResumes rows={resumes} highlighted={highlighted} />
        <SeedsAndUpsets seeds={seeds} years={years} upsets={top.upsets} />
        <PlayoffRisers risers={risers} highlighted={highlighted} />
      </Section>
    </div>
  )
}
