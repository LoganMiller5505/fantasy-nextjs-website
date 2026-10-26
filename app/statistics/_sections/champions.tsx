"use client"

import { Trophy } from "lucide-react"
import type { SeasonResult } from "../_lib/stats"
import { Panel, SimpleTable } from "../_components/ui"

export function Champions({ results }: { results: SeasonResult[] }) {
  return (
    <div className="grid gap-4">
      <Panel
        title="Season by season"
        description="Champion, runner-up and third each season, with who led the regular season."
        method="The final is played in the last week. Teams that miss the playoffs play consolation games instead."
      >
        <SimpleTable
          head={["Season", "Champion", "Runner-up", "3rd", "Regular-season #1", "Most points"]}
          rows={results.map((r) => [
            r.year,
            r.inProgress ? (
              <span className="text-muted-foreground">In progress</span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium">
                <Trophy className="size-3.5" aria-hidden />
                {r.champion}
              </span>
            ),
            r.runnerUp ?? "—",
            r.third ?? "—",
            r.inProgress ? `${r.regularSeasonTop} (so far)` : r.regularSeasonTop,
            r.inProgress ? `${r.pointsLeader} (so far)` : r.pointsLeader,
          ])}
        />
      </Panel>
    </div>
  )
}
