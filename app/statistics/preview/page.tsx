import type { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getLeague } from "@/lib/league"
import {
  careers,
  closestRivalries,
  divisions,
  latestYear,
  lookingAhead,
  luckRows,
  managersIn,
  playedSides,
  playoffCounts,
  powerRankings,
  recordBook,
  scoringRows,
  seasonResults,
  seasonStory,
  seasonsOf,
} from "./stats"
import { Scoring } from "./sections/scoring"
import { SeasonStory } from "./sections/season-story"
import { Luck } from "./sections/luck"
import { RecordBook } from "./sections/record-book"
import { Champions } from "./sections/champions"
import { Rivalries } from "./sections/rivalries"
import { DivisionsView } from "./sections/divisions"
import { PowerRankings } from "./sections/power-rankings"
import { LookingAhead } from "./sections/looking-ahead"
import { CareersView } from "./sections/careers"

export const metadata: Metadata = { title: "Statistics preview · The League Huddle" }

const tabs = [
  ["scoring", "Scoring"],
  ["season", "Season story"],
  ["luck", "Luck"],
  ["records", "Record book"],
  ["champions", "Champions"],
  ["rivalries", "Rivalries"],
  ["divisions", "Divisions"],
  ["power", "Power rankings"],
  ["ahead", "Looking ahead"],
  ["careers", "Careers"],
] as const

// A showcase of what the league schema can support, ahead of moving /statistics onto it.
export default async function StatisticsPreviewPage() {
  const league = await getLeague()
  const sides = playedSides(league)
  const seasons = seasonsOf(league)
  const current = latestYear(league)
  const results = seasonResults(league, sides)
  const allManagers = [...new Set(league.teams.map((t) => t.manager))].sort()

  return (
    // minmax(0, 1fr) keeps the scrolling tab list from widening the page on phones
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">Statistics preview</h1>
        <Badge variant="secondary">Preview</Badge>
      </div>
      <p className="text-muted-foreground max-w-prose">
        Ideas for the statistics page, built on the league&apos;s real games. Pick the ones worth keeping.
      </p>

      <Tabs defaultValue="scoring">
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <TabsList className="w-max">
            {tabs.map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="scoring" className="pt-2">
          <Scoring rows={scoringRows(sides, results)} />
        </TabsContent>
        <TabsContent value="season" className="pt-2">
          <SeasonStory stories={Object.fromEntries(seasons.map((y) => [y, seasonStory(league, sides, y)]))} />
        </TabsContent>
        <TabsContent value="luck" className="pt-2">
          <Luck
            bySeason={{
              all: luckRows(sides, "all"),
              ...Object.fromEntries(seasons.map((y) => [y, luckRows(sides, y)])),
            }}
          />
        </TabsContent>
        <TabsContent value="records" className="pt-2">
          <RecordBook book={recordBook(sides, managersIn(league, current))} />
        </TabsContent>
        <TabsContent value="champions" className="pt-2">
          <Champions results={results} counts={playoffCounts(sides, results)} />
        </TabsContent>
        <TabsContent value="rivalries" className="pt-2">
          <Rivalries sides={sides} managers={allManagers} closest={closestRivalries(sides)} />
        </TabsContent>
        <TabsContent value="divisions" className="pt-2">
          <DivisionsView bySeason={Object.fromEntries(seasons.map((y) => [y, divisions(league, sides, y)]))} />
        </TabsContent>
        <TabsContent value="power" className="pt-2">
          <PowerRankings data={powerRankings(league, sides)} />
        </TabsContent>
        <TabsContent value="ahead" className="pt-2">
          <LookingAhead data={lookingAhead(league, sides)} />
        </TabsContent>
        <TabsContent value="careers" className="pt-2">
          <CareersView data={careers(league, sides, results)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
