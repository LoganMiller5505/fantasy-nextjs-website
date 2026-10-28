import { getStats } from "../_lib/data"
import { powerRankings } from "../_lib/stats"
import { PowerRankings } from "../_sections/power-rankings"

export default async function RankingsPage() {
  const { league, sides } = await getStats()
  return <PowerRankings data={powerRankings(league, sides)} />
}
