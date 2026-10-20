"use client"

import type { brackets } from "../more-stats"
import type { playoffRace } from "../playoff-race"
import type { playoffHeadlines, ResumeRow, seedTable } from "../playoffs"
import type { SeasonResult, playoffCounts, playoffRisers } from "../stats"
import { StatTile, fmt } from "../ui"
import { Brackets } from "./brackets"
import { Champions } from "./champions"
import { PlayoffResumes, SeedsAndUpsets } from "./playoff-history"
import { PlayoffRace } from "./playoff-race"
import { PlayoffRisers } from "./playoff-risers"

const names = (ms: string[]) => ms.join(", ")

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// Everything about the playoffs: this season's race, past champions and brackets, and how each
// manager has done once the regular season ends
export function Playoffs({
  top,
  race,
  results,
  counts,
  seasons,
  inProgress,
  resumes,
  seeds,
  years,
  risers,
}: {
  top: ReturnType<typeof playoffHeadlines>
  race: ReturnType<typeof playoffRace>
  results: SeasonResult[]
  counts: ReturnType<typeof playoffCounts>
  seasons: ReturnType<typeof brackets>
  inProgress: number | null
  resumes: ResumeRow[]
  seeds: ReturnType<typeof seedTable>
  years: number[]
  risers: ReturnType<typeof playoffRisers>
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>

      {race && (
        <Section title={`${race.year} playoff race`}>
          <PlayoffRace race={race} />
        </Section>
      )}

      <Section title="Champions">
        <Champions results={results} counts={counts} />
      </Section>

      <Section title="Brackets">
        <Brackets seasons={seasons} inProgress={inProgress} />
      </Section>

      <Section title="Playoff performance">
        <PlayoffResumes rows={resumes} />
        <SeedsAndUpsets seeds={seeds} years={years} upsets={top.upsets} />
        <PlayoffRisers risers={risers} />
      </Section>
    </div>
  )
}
