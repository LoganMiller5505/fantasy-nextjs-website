"use client"

import { HeatTable, Panel, Section, SimpleTable, diverging, fmt } from "../_components/ui"
import type { DraftPickRow } from "../_lib/preview"
import type { DraftData } from "./preview"

// A board cell is fully tinted this many places above or below its draft slot
const VALUE_LIMIT = 20

const slot = (p: DraftPickRow) => `${p.round}.${String(p.round_pick).padStart(2, "0")}`
const signed = (x: number) => (x > 0 ? `+${x}` : String(x))

function PickTable({ picks, highlighted }: { picks: DraftPickRow[]; highlighted: string | null }) {
  return (
    <SimpleTable
      head={["Pick", "Manager", "Player", "Drafted", "Finished", "Pts"]}
      align={["left", "left", "left", "right", "right", "right"]}
      highlight={(i) => picks[i].manager === highlighted}
      rows={picks.map((p) => [
        slot(p),
        p.manager,
        p.name,
        `${p.position}${p.drafted}`,
        `${p.position}${p.finished}`,
        fmt(p.points, 1),
      ])}
    />
  )
}

// `latestOnly`: the page is showing all-time, so this shows the latest draft instead
export function DraftSection({ data, latestOnly, highlighted }: { data: DraftData | undefined; latestOnly: boolean; highlighted: string | null }) {
  if (!data?.rounds.length) {
    return (
      <Section title="Draft">
        <p className="text-muted-foreground text-sm">ESPN has no draft for this season.</p>
      </Section>
    )
  }
  const { year, order, rounds, steals, busts, preseason } = data

  return (
    <Section
      title={`Draft · ${year}`}
      description={`${latestOnly ? `Each draft is one season's, so this is ${year}; pick a season above to see another. ` : ""}Who each pick turned out to be, measured against where he finished at his position.`}
    >
      <Panel
        title="Draft board"
        description="Every pick by round and team. Blue finished above where he was taken at his position, red below."
        method={`A pick's value is where he was taken among his position (the 5th RB off the board is RB5) less where he finished among every player at that position in full-season points, whoever had him. Full strength is ${VALUE_LIMIT} places either way.`}
      >
        <HeatTable
          corner="Round ↓  Team →"
          columns={order}
          rows={rounds.map((r) => ({
            key: `Round ${r.round}`,
            label: `R${r.round}`,
            cells: r.picks.map((p) =>
              p
                ? {
                    text: p.short,
                    ...diverging(p.value, VALUE_LIMIT),
                    title: `${slot(p)} ${p.name} (${p.position}), ${p.manager}: drafted ${p.position}${p.drafted}, finished ${p.position}${p.finished} with ${fmt(p.points, 1)} points (${fmt(p.forTeam, 1)} in ${p.manager}'s lineup)`,
                  }
                : { text: "", t: null }
            ),
          }))}
        />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Steals" description="Picks who finished furthest above their draft slot at their position." method="Kickers and defenses are left out: they're taken late and score evenly, so their places swing widely.">
          <PickTable picks={steals} highlighted={highlighted} />
        </Panel>
        <Panel title="Busts" description="Picks from the first half of the draft who finished furthest below their draft slot." method="Kickers and defenses are left out. A player hurt early finishes low, so injuries count as busts here.">
          <PickTable picks={busts} highlighted={highlighted} />
        </Panel>
      </div>
      <Panel
        title="ESPN's preseason projection"
        description={
          preseason.inProgress
            ? "Where ESPN projected each team to finish on draft day, against the standings so far. Biggest climbers first."
            : "Where ESPN projected each team to finish on draft day, against where it did. Biggest climbers first."
        }
      >
        <SimpleTable
          head={["Manager", "Projected", preseason.inProgress ? "Now" : "Finished", "Change"]}
          align={["left", "right", "right", "right"]}
          highlight={(i) => preseason.rows[i].manager === highlighted}
          rows={preseason.rows.map((r) => [r.manager, r.projected, r.finish, signed(r.change)])}
        />
      </Panel>
    </Section>
  )
}
