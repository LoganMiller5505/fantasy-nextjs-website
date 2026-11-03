import { getStats } from "../_lib/data"
import { espnContext, h2hAdditions } from "../_lib/espn/additions"
import { h2hGrid } from "../_lib/more-stats"
import { closestRivalries, nemeses } from "../_lib/stats"
import { HeadToHead } from "../_sections/head-to-head"

export default async function HeadToHeadPage() {
  const [{ league, sides }, ctx] = await Promise.all([getStats(), espnContext()])

  return (
    <HeadToHead
      grid={h2hGrid(sides)}
      sides={sides}
      managers={[...new Set(league.teams.map((t) => t.manager))].sort()}
      closest={closestRivalries(sides)}
      foes={nemeses(sides)}
      espn={h2hAdditions(ctx)}
    />
  )
}
