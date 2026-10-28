"use client"

import * as React from "react"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { Toolbar } from "../_components/scope"
import { Section } from "../_components/ui"
import type { h2hGrid } from "../_lib/more-stats"
import type { Side, closestRivalries, nemeses } from "../_lib/stats"
import { H2HGrid } from "./h2h-grid"
import { LeagueRivalries, Rivalry, type Pair } from "./rivalries"

// One rivalry first (yours, once you're highlighted), then everyone against everyone, then the
// league-wide lists
export function HeadToHead({
  grid,
  sides,
  managers,
  closest,
  foes,
}: {
  grid: ReturnType<typeof h2hGrid>
  sides: Side[]
  managers: string[]
  closest: ReturnType<typeof closestRivalries>
  foes: ReturnType<typeof nemeses>
}) {
  const [highlighted, setHighlighted] = useHighlight(managers)
  // The rivalry's first manager follows the highlight until one is picked for the rivalry itself
  // (in its panel, the grid or the nemesis table). Until both are known, the panel asks for them.
  const [first, setFirst] = React.useState<string | null>(null)
  const [second, setSecond] = React.useState<string | null>(null)
  const a = first ?? highlighted
  const b = second !== a ? second : null
  const setRivalry = ([x, y]: Pair) => {
    setFirst(x)
    setSecond(y)
  }
  // A new highlight takes over the rivalry; clearing it leaves the rivalry where it was
  const changeHighlight = (m: string | null) => {
    setHighlighted(m)
    setFirst(m == null ? a : null)
  }
  // A grid cell or a nemesis link opens that rivalry and scrolls to it
  const openRivalry = (x: string, y: string) => {
    setRivalry([x, y])
    document.getElementById("rivalry")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <HighlightPicker managers={managers} value={highlighted} onChange={changeHighlight} />
      </Toolbar>
      <Section title="Rivalry">
        <Rivalry sides={sides} managers={managers} pair={[a, b]} setRivalry={setRivalry} />
      </Section>
      <Section title="Everyone">
        <H2HGrid grid={grid} openRivalry={openRivalry} highlighted={highlighted} />
      </Section>
      <Section title="League-wide">
        <LeagueRivalries closest={closest} foes={foes} highlighted={highlighted} openRivalry={openRivalry} />
      </Section>
    </div>
  )
}
