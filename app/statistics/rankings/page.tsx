import { getStats } from "../_lib/data"
import { espnContext, rankingsAdditions } from "../_lib/espn/additions"
import { powerRankings } from "../_lib/stats"
import { PowerRankings } from "../_sections/power-rankings"

export default async function RankingsPage() {
  const [{ league, sides }, ctx] = await Promise.all([getStats(), espnContext()])
  return <PowerRankings data={powerRankings(league, sides)} espn={rankingsAdditions(ctx)} />
}
