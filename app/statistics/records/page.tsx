import { getStats } from "../_lib/data"
import { managersIn, recordBook, seasonRecords } from "../_lib/stats"
import { RecordsView } from "../_sections/records"

export default async function RecordsPage() {
  const { league, sides, current } = await getStats()

  return (
    <RecordsView
      book={recordBook(sides, managersIn(league, current))}
      seasons={seasonRecords(league, sides)}
      managers={[...new Set(league.teams.map((t) => t.manager))].sort()}
    />
  )
}
