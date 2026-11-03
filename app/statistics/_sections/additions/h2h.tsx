"use client"

import * as React from "react"
import { Panel, Picker, Section, SimpleTable, fmt } from "../../_components/ui"
import type { H2HAdditionsData } from "../../_lib/espn/additions"
import type { FoePlayer } from "../../_lib/espn/h2h"

const foe = (p: FoePlayer | undefined) => (p ? `${p.name} (${fmt(p.points, 1)} in ${p.games})` : "")

// Rivalries player by player: the opponents' players who did the most damage, and the trades
// between a pair. `pair` comes from the page's rivalry; without one, the panel picks its own.
export function H2HAdditions({
  data,
  pair,
  highlighted,
}: {
  data: H2HAdditionsData
  pair?: [string | null, string | null]
  highlighted: string | null
}) {
  const managers = data.everyone.map((e) => e.manager)
  const [own, setOwn] = React.useState<[string | null, string | null]>([null, null])
  const a = pair ? pair[0] : (own[0] ?? highlighted ?? managers[0])
  const b = pair ? pair[1] : (own[1] ?? managers.find((m) => m !== a) ?? null)
  const trades = a && b ? data.trades.filter((t) => t.sides.some((s) => s.manager === a) && t.sides.some((s) => s.manager === b)) : []
  const best = (victim: string, by: string) => data.pairs[`${victim}|${by}`] ?? []

  return (
    <Section title="Players and trades" description="Rivalries player by player: whose players did the damage, and what the two have traded.">
      <Panel
        title={a && b ? `${a} and ${b}, player by player` : "A rivalry, player by player"}
        description="Each side's starters who scored the most in their meetings, and any trades between them."
        method="Every meeting, playoffs included. Points are a starter's in the games between the two; the count is how many of those games he started."
        controls={
          pair ? undefined : (
            <>
              <Picker label="First manager" size="sm" options={managers} value={a} onChange={(m) => setOwn([m, b])} />
              <Picker label="Second manager" size="sm" options={managers.filter((m) => m !== a)} value={b} onChange={(m) => setOwn([a, m])} />
            </>
          )
        }
      >
        {a && b ? (
          <div className="grid gap-3">
            <SimpleTable
              head={["Side", "Best against the other", "2nd", "3rd"]}
              align={["left", "left", "left", "left"]}
              highlight={(i) => [a, b][i] === highlighted}
              rows={[
                [a, ...[0, 1, 2].map((i) => foe(best(b, a)[i]))],
                [b, ...[0, 1, 2].map((i) => foe(best(a, b)[i]))],
              ]}
            />
            {trades.length > 0 && (
              <SimpleTable
                head={["Trade", "Manager", "Received", "Used"]}
                align={["left", "left", "left", "right"]}
                rows={trades.flatMap((t) =>
                  t.sides.map((s, i) => [
                    i === 0 ? `${t.year} ${t.week}` : "",
                    `${s.manager}${t.winner === s.manager ? " ✓" : ""}`,
                    s.received.map((r) => r.name).join(", "),
                    fmt(s.points, 1),
                  ])
                )}
              />
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Pick a rivalry above to see it player by player.</p>
        )}
      </Panel>
      <Panel
        title="Player nemeses"
        description="The opposing players who've scored the most against each manager."
        method="Every game, playoffs included: each opposing starter's points in games against that manager, and how many of those games he started."
      >
        <SimpleTable
          head={["Manager", "Nemesis", "2nd", "3rd"]}
          align={["left", "left", "left", "left"]}
          highlight={(i) => data.everyone[i].manager === highlighted}
          rows={data.everyone.map((e) => [e.manager, foe(e.players[0]), foe(e.players[1]), foe(e.players[2])])}
        />
      </Panel>
    </Section>
  )
}
