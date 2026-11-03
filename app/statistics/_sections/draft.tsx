"use client"

import { HeatTable, Panel, Section, diverging, fmt } from "../_components/ui"
import type { DraftPickRow, draft } from "../_lib/espn/draft"

export type DraftData = ReturnType<typeof draft>

// A board cell is fully tinted this many places above or below its draft slot
const VALUE_LIMIT = 20

export const slot = (p: DraftPickRow) => `${p.round}.${String(p.round_pick).padStart(2, "0")}`

// `latestOnly`: the page is showing all-time, so this shows the latest draft instead
export function DraftSection({ data, latestOnly }: { data: DraftData | undefined; latestOnly: boolean }) {
  if (!data?.rounds.length) {
    return (
      <Section title="Draft">
        <p className="text-muted-foreground text-sm">ESPN has no draft for this season.</p>
      </Section>
    )
  }
  const { year, order, rounds } = data

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
    </Section>
  )
}
