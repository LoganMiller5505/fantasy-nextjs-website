import { draftTab, espnContext } from "../_lib/espn/additions"
import { parseScope } from "../_lib/scope"
import { DraftMovesView } from "../_sections/draft-moves"

export default async function DraftPage({ searchParams }: { searchParams: Promise<{ season?: string | string[] }> }) {
  const ctx = await espnContext()
  return (
    <DraftMovesView
      initialScope={parseScope((await searchParams).season, ctx.scopes, ctx.stats.current)}
      scopes={ctx.scopes}
      data={draftTab(ctx)}
    />
  )
}
