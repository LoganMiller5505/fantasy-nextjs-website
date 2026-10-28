import { getStats } from "../_lib/data"
import { scheduleSwap } from "../_lib/more-stats"
import { parseScope } from "../_lib/scope"
import { luckRows, type Scope } from "../_lib/stats"
import { LuckView } from "../_sections/luck"

export default async function LuckPage({ searchParams }: { searchParams: Promise<{ season?: string | string[] }> }) {
  const { sides, seasons, current } = await getStats()
  const scopes: Scope[] = ["all", ...seasons]

  return (
    <LuckView
      initialScope={parseScope((await searchParams).season, scopes, current)}
      scopes={scopes}
      bySeason={Object.fromEntries(scopes.map((s) => [s, luckRows(sides, s)]))}
      swaps={Object.fromEntries(seasons.map((y) => [y, scheduleSwap(sides, y)]))}
    />
  )
}
