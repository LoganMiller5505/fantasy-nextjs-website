import { getStats } from "../_lib/data"
import { careers, winPctByWeek, type Scope } from "../_lib/stats"
import { ManagersIndex } from "../_sections/managers"

export default async function ManagersPage() {
  const { league, sides, results, seasons } = await getStats()
  const scopes: Scope[] = ["all", ...seasons]

  return (
    <ManagersIndex
      careers={careers(league, sides, results)}
      scopes={scopes}
      byWeek={Object.fromEntries(scopes.map((s) => [s, winPctByWeek(league, sides, s)]))}
    />
  )
}
