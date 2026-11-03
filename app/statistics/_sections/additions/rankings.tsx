"use client"

import * as React from "react"
import { Segmented } from "../../_components/scope"
import { Panel, Section, SimpleTable } from "../../_components/ui"
import type { RankingsAdditionsData } from "../../_lib/espn/additions"

const signed = (x: number) => (x > 0 ? `+${x}` : String(x))

// ESPN as a ranker of its own: its projected finish now, and on draft day against how seasons went
export function RankingsAdditions({ data, highlighted }: { data: RankingsAdditionsData; highlighted: string | null }) {
  const years = Object.keys(data.preseason).map(Number).sort((a, b) => b - a)
  const [year, setYear] = React.useState(years[0])
  const draftDay = data.preseason[year]
  const inSeason = data.inSeason

  return (
    <Section title="Per ESPN" description="ESPN's own projected finishes, from its projections rather than the ballots.">
      {inSeason && (
        <Panel
          title="ESPN's projected finish now"
          description="Where ESPN projects each team to finish this season, beside the consensus ballot and the standings."
          method="ESPN's in-season projected finish for each team, as of the last ESPN sync. Consensus is the latest power-rankings ballot; Standing is by record, then points for."
        >
          <SimpleTable
            head={["Manager", "ESPN", "Consensus", "Standing"]}
            align={["left", "right", "right", "right"]}
            highlight={(i) => inSeason[i].manager === highlighted}
            rows={inSeason.map((r) => [r.manager, r.rank, r.consensus ?? "—", r.standing ?? "—"])}
          />
        </Panel>
      )}
      {draftDay && (
        <Panel
          title="ESPN's preseason projection"
          description={
            draftDay.inProgress
              ? "Where ESPN projected each team to finish on draft day, against the standings so far. Biggest climbers first."
              : "Where ESPN projected each team to finish on draft day, against where it did. Biggest climbers first."
          }
          method="ESPN's projected finish is from draft day. A finished season compares it with the final place, playoffs included; one in progress, with the standings (wins, then points for)."
          controls={<Segmented label="Season" size="sm" options={years} value={year} onChange={setYear} />}
        >
          <SimpleTable
            head={["Manager", "Projected", draftDay.inProgress ? "Now" : "Finished", "Change"]}
            align={["left", "right", "right", "right"]}
            highlight={(i) => draftDay.rows[i].manager === highlighted}
            rows={draftDay.rows.map((r) => [r.manager, r.projected, r.finish, signed(r.change)])}
          />
        </Panel>
      )}
    </Section>
  )
}
