"use client"

import { Panel, Section, SimpleTable, fmt } from "../../_components/ui"
import type { PlayoffsAdditionsData } from "../../_lib/espn/additions"

const percent = (x: number) => `${(100 * x).toFixed(1)}%`
const signed = (x: number) => (x > 0 ? `+${x.toFixed(1)}` : x.toFixed(1))

// Lineups when it counts: who sets the best ones in the bracket, and the games that decided it
export function PlayoffsAdditions({ data, highlighted }: { data: PlayoffsAdditionsData; highlighted: string | null }) {
  const { lineups, heroes } = data
  if (!lineups.length) return null
  return (
    <Section title="Lineups in the bracket" description="From ESPN's lineups, championship-bracket games only. Every season ESPN has.">
      <Panel
        title="Clutch lineup setters"
        description="Lineup efficiency, points left on the bench and points against projection in bracket games. Most efficient first."
        method="Efficiency is points started over the best lineup the roster allowed, as on Lineups. Consolation games are left out."
      >
        <SimpleTable
          head={["Manager", "Games", "W-L", "Efficiency", "Left/wk", "Vs proj/wk"]}
          align={["left", "right", "right", "right", "right", "right"]}
          highlight={(i) => lineups[i].player === highlighted}
          rows={lineups.map((r) => [r.player, r.Games, r["W-L"], percent(r.Efficiency), fmt(r["Left/wk"], 1), signed(r["+/- proj/wk"])])}
        />
      </Panel>
      <Panel title="Playoff heroes" description="The best single games by a starter in the bracket.">
        <SimpleTable
          head={["Season", "Round", "Manager", "Player", "Pts", "Result"]}
          align={["left", "left", "left", "left", "right", "left"]}
          highlight={(i) => heroes[i].manager === highlighted}
          rows={heroes.map((h) => [h.year, h.round, h.manager, `${h.name} (${h.position})`, fmt(h.points, 1), h.won ? "Won" : "Lost"])}
        />
      </Panel>
    </Section>
  )
}
