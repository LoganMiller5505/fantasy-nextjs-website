import type { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { getLeague } from "@/lib/league"
import {
  careers,
  closestRivalries,
  divisionStrength,
  divisions,
  latestYear,
  lookingAhead,
  luckRows,
  managersIn,
  nemeses,
  playedSides,
  playoffCounts,
  playoffRisers,
  powerRankings,
  recordBook,
  scoringRows,
  scoringTrend,
  seasonResults,
  seasonStory,
  seasonsOf,
} from "./stats"
import { brackets, consistency, elo, h2hGrid, scheduleSwap, weeklyGrid } from "./more-stats"
import { playoffRace } from "./playoff-race"
import { playoffHeadlines, playoffHistory, playoffResumes, seedTable } from "./playoffs"
import { Playoffs } from "./sections/playoffs"
import { PreviewTabs, type TabGroup } from "./sections/preview-tabs"
import { Scoring } from "./sections/scoring"
import { SeasonStory } from "./sections/season-story"
import { Luck } from "./sections/luck"
import { RecordBook } from "./sections/record-book"
import { Rivalries } from "./sections/rivalries"
import { DivisionsView } from "./sections/divisions"
import { PowerRankings } from "./sections/power-rankings"
import { LookingAhead } from "./sections/looking-ahead"
import { CareersView } from "./sections/careers"
import { Consistency } from "./sections/consistency"
import { WeeklyGrid } from "./sections/weekly-grid"
import { ScheduleSwap } from "./sections/schedule-swap"
import { H2HGrid } from "./sections/h2h-grid"
import { EloView } from "./sections/elo"

export const metadata: Metadata = { title: "Statistics preview · The League Huddle" }

// Views grouped by theme; the first view in each group opens by default
const groups: TabGroup[] = [
  { value: "scoring", label: "Scoring", items: [
    { value: "scoring", label: "Scoring" },
    { value: "consistency", label: "Consistency" },
    { value: "grid", label: "Weekly grid" },
  ] },
  { value: "seasons", label: "Seasons", items: [
    { value: "season", label: "Season story" },
    { value: "divisions", label: "Divisions" },
    { value: "power", label: "Power rankings" },
    { value: "ahead", label: "Looking ahead" },
  ] },
  { value: "luck", label: "Luck", items: [
    { value: "luck", label: "Luck" },
    { value: "swap", label: "Schedule swap" },
  ] },
  { value: "playoffs", label: "Playoffs", items: [{ value: "playoffs", label: "Playoffs" }] },
  { value: "h2h", label: "Head-to-head", items: [
    { value: "rivalries", label: "Rivalries" },
    { value: "h2h", label: "H2H grid" },
  ] },
  { value: "alltime", label: "All-time", items: [
    { value: "records", label: "Record book" },
    { value: "careers", label: "Careers" },
    { value: "elo", label: "Elo" },
  ] },
]

// A showcase of what the league schema can support, ahead of moving /statistics onto it.
export default async function StatisticsPreviewPage() {
  const league = await getLeague()
  const sides = playedSides(league)
  const seasons = seasonsOf(league)
  const current = latestYear(league)
  const results = seasonResults(league, sides)
  const allManagers = [...new Set(league.teams.map((t) => t.manager))].sort()
  const history = playoffHistory(league, sides, results)
  const resumes = playoffResumes(league, history)
  const bySeason = <T,>(derive: (year: number) => T) => Object.fromEntries(seasons.map((y) => [y, derive(y)]))

  return (
    // minmax(0, 1fr) keeps the scrolling tab lists from widening the page on phones
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">Statistics preview</h1>
        <Badge variant="secondary">Preview</Badge>
      </div>
      <p className="text-muted-foreground max-w-prose">
        Ideas for the statistics page, built on the league&apos;s real games. Pick the ones worth keeping.
      </p>

      <PreviewTabs
        groups={groups}
        panels={{
          scoring: <Scoring rows={scoringRows(sides, results)} trend={scoringTrend(sides)} />,
          consistency: <Consistency bySeason={{ all: consistency(sides, "all"), ...bySeason((y) => consistency(sides, y)) }} />,
          grid: <WeeklyGrid bySeason={bySeason((y) => weeklyGrid(sides, y))} />,

          season: <SeasonStory stories={bySeason((y) => seasonStory(league, sides, y))} />,
          divisions: (
            <DivisionsView bySeason={bySeason((y) => divisions(league, sides, y))} strength={divisionStrength(league, sides)} />
          ),
          power: <PowerRankings data={powerRankings(league, sides)} />,
          ahead: <LookingAhead data={lookingAhead(league, sides)} />,

          luck: <Luck bySeason={{ all: luckRows(sides, "all"), ...bySeason((y) => luckRows(sides, y)) }} />,
          swap: <ScheduleSwap bySeason={bySeason((y) => scheduleSwap(sides, y))} />,

          playoffs: (
            <Playoffs
              top={playoffHeadlines(league, history, resumes)}
              race={playoffRace(league, sides, results)}
              results={results}
              counts={playoffCounts(sides, results)}
              seasons={brackets(league, sides, results)}
              inProgress={results.find((r) => r.inProgress)?.year ?? null}
              resumes={resumes}
              seeds={seedTable(history)}
              years={history.years}
              risers={playoffRisers(sides)}
            />
          ),

          rivalries: <Rivalries sides={sides} managers={allManagers} closest={closestRivalries(sides)} foes={nemeses(sides)} />,
          h2h: <H2HGrid grid={h2hGrid(sides)} />,

          records: <RecordBook book={recordBook(sides, managersIn(league, current))} />,
          careers: <CareersView data={careers(league, sides, results)} />,
          elo: <EloView data={elo(league, sides)} />,
        }}
      />
    </div>
  )
}
