import { getStats } from "./_lib/data"
import { weeklyGrid } from "./_lib/more-stats"
import { parseScope } from "./_lib/scope"
import { divisionStrength, divisions, seasonStory } from "./_lib/stats"
import { SeasonView } from "./_sections/season"

export default async function SeasonPage({ searchParams }: { searchParams: Promise<{ season?: string | string[] }> }) {
  const { league, sides, seasons, current } = await getStats()
  const year = parseScope((await searchParams).season, seasons, current) as number
  const bySeason = <T,>(derive: (year: number) => T) => Object.fromEntries(seasons.map((y) => [y, derive(y)]))

  return (
    <SeasonView
      initialYear={year}
      years={seasons}
      stories={bySeason((y) => seasonStory(league, sides, y))}
      grids={bySeason((y) => weeklyGrid(sides, y))}
      divisionsBySeason={bySeason((y) => divisions(league, sides, y))}
      strength={divisionStrength(league, sides)}
    />
  )
}
