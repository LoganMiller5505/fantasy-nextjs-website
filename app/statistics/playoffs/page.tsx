import { getStats } from "../_lib/data"
import { brackets } from "../_lib/more-stats"
import { playoffHeadlines, playoffHistory, playoffResumes, seedTable } from "../_lib/playoffs"
import { playoffRisers } from "../_lib/stats"
import { Playoffs } from "../_sections/playoffs"

export default async function PlayoffsPage() {
  const { league, sides, results } = await getStats()
  const history = playoffHistory(league, sides, results)
  const resumes = playoffResumes(league, history)

  return (
    <Playoffs
      top={playoffHeadlines(league, history, resumes)}
      results={results}
      seasons={brackets(league, sides, results)}
      inProgress={results.find((r) => r.inProgress)?.year ?? null}
      resumes={resumes}
      seeds={seedTable(history)}
      years={history.years}
      risers={playoffRisers(sides)}
    />
  )
}
