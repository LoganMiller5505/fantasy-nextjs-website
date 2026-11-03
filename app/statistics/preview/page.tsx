import {
  draftTab,
  espnContext,
  h2hAdditions,
  lineupsTab,
  luckAdditions,
  managerAdditions,
  outlookAdditions,
  playoffsAdditions,
  rankingsAdditions,
  recordsAdditions,
  scoringAdditions,
  seasonAdditions,
} from "../_lib/espn/additions"
import { parseScope } from "../_lib/scope"
import { PreviewView } from "../_sections/preview"

// Every ESPN-based addition to the statistics pages in one place, each also on its own tab.
// Reached by URL only.
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ season?: string | string[] }> }) {
  const ctx = await espnContext()

  return (
    <PreviewView
      initialScope={parseScope((await searchParams).season, ctx.scopes, ctx.stats.current)}
      scopes={ctx.scopes}
      season={seasonAdditions(ctx)}
      outlook={outlookAdditions(ctx)}
      rankings={rankingsAdditions(ctx)}
      luck={luckAdditions(ctx)}
      lineups={lineupsTab(ctx)}
      h2h={h2hAdditions(ctx)}
      scoring={scoringAdditions(ctx)}
      draft={draftTab(ctx)}
      managers={managerAdditions(ctx)}
      playoffs={playoffsAdditions(ctx)}
      records={recordsAdditions(ctx)}
    />
  )
}
