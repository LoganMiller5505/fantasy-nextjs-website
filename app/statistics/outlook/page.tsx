import { getStats } from "../_lib/data"
import { playoffRace } from "../_lib/playoff-race"
import { lookingAhead } from "../_lib/stats"
import { OutlookView } from "../_sections/outlook"

// The rest of the current season: next week's games, playoff odds and who has the harder run-in
export default async function OutlookPage() {
  const { league, sides, results } = await getStats()
  const ahead = lookingAhead(league, sides)

  if (!ahead) return <p className="text-muted-foreground">Every game this season has been played.</p>
  return <OutlookView ahead={ahead} race={playoffRace(league, sides, results)} />
}
