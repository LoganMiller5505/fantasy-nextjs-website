import { getStats } from "../_lib/data"
import { espnContext, recordsAdditions } from "../_lib/espn/additions"
import { managersIn, recordBook, seasonRecords } from "../_lib/stats"
import { RecordsView } from "../_sections/records"

export default async function RecordsPage() {
  const [{ league, sides, current }, ctx] = await Promise.all([getStats(), espnContext()])

  return (
    <RecordsView
      book={recordBook(sides, managersIn(league, current))}
      seasons={seasonRecords(league, sides)}
      managers={[...new Set(league.teams.map((t) => t.manager))].sort()}
      espn={recordsAdditions(ctx)}
    />
  )
}
