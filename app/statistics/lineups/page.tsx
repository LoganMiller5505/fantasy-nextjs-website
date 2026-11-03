import { espnContext, lineupsTab } from "../_lib/espn/additions"
import { parseScope } from "../_lib/scope"
import { LineupsView } from "../_sections/lineups"

export default async function LineupsPage({ searchParams }: { searchParams: Promise<{ season?: string | string[] }> }) {
  const ctx = await espnContext()
  return (
    <LineupsView
      initialScope={parseScope((await searchParams).season, ctx.scopes, ctx.stats.current)}
      scopes={ctx.scopes}
      bySeason={lineupsTab(ctx)}
    />
  )
}
