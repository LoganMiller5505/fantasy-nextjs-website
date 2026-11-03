"use client"

import { Panel, SimpleTable, fmt } from "../../_components/ui"
import type { Honours } from "../../_lib/espn/season"

// Each week's ESPN honours, beside the league's weekly awards
export function SeasonAdditions({ honours, highlighted }: { honours: Honours[]; highlighted: string | null }) {
  const involves = (h: Honours) => [h.player?.manager, h.bench?.manager, h.upset?.winner, h.upset?.loser, h.dud?.manager].includes(highlighted ?? undefined)
  return (
    <Panel
      title="ESPN honours"
      description="Each week's best starter, costliest bench call, biggest upset by ESPN's projections, and the starter furthest below his."
      method="From ESPN's weekly lineups. Bench call: the bench player who would have added the most in place of a starter whose slot he could fill. Upset: the win by the team ESPN projected furthest behind. Dud: the starter who scored furthest below his projection. Regular-season weeks ESPN has closed."
    >
      {honours.length ? (
        <SimpleTable
          head={["Week", "Player of the week", "Bench call", "Upset", "Dud"]}
          align={["left", "left", "left", "left", "left"]}
          highlight={(i) => highlighted != null && involves(honours[i])}
          rows={honours.map((h) => [
            h.week,
            h.player ? `${h.player.name} (${fmt(h.player.points, 1)}), ${h.player.manager}` : "—",
            h.bench ? `${h.bench.manager} sat ${h.bench.benched} for ${h.bench.started} (−${fmt(h.bench.gain, 1)})` : "—",
            h.upset ? `${h.upset.winner} over ${h.upset.loser} (${fmt(h.upset.gap, 1)} behind)` : "—",
            h.dud ? `${h.dud.name}, ${h.dud.manager} (${fmt(h.dud.points, 1)} of ${fmt(h.dud.projected, 1)})` : "—",
          ])}
        />
      ) : (
        <p className="text-muted-foreground text-sm">ESPN hasn&apos;t closed a week of this season yet.</p>
      )}
    </Panel>
  )
}
