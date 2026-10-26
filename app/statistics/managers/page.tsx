import { getStats } from "../_lib/data"
import { managerProfiles } from "../_lib/managers"
import { careers, winPctByWeek, type Scope } from "../_lib/stats"
import { ManagersView } from "../_sections/managers"

export default async function ManagersPage() {
  const { league, sides, results, seasons } = await getStats()
  const scopes: Scope[] = ["all", ...seasons]

  return (
    <ManagersView
      profiles={managerProfiles(league, sides, results)}
      careers={careers(league, sides, results)}
      scopes={scopes}
      byWeek={Object.fromEntries(scopes.map((s) => [s, winPctByWeek(league, sides, s)]))}
    />
  )
}
