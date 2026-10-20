"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { GameLine, recordBook } from "../stats"
import { Panel, SERIES, SimpleTable, StatTile, fmt } from "../ui"

type Book = ReturnType<typeof recordBook>

const when = (g: GameLine) => `${g.year} ${g.label}`
const versus = (g: GameLine) => `${g.manager} ${fmt(g.pf)} – ${fmt(g.pa)} ${g.opponent}`

const config = { pf: { label: "Points", theme: SERIES.blue } } satisfies ChartConfig

export function RecordBook({ book }: { book: Book }) {
  const topScores = book.topScores.map((g, i) => ({ ...g, key: `${i + 1}. ${g.manager}`, when: `${g.year} ${g.label}` }))

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground">All-time. Single-game records leave out double weeks, which cover two NFL weeks.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Highest score" value={fmt(book.highest.pf)} detail={`${book.highest.manager} vs ${book.highest.opponent}, ${when(book.highest)}`} />
        <StatTile label="Lowest score" value={fmt(book.lowest.pf)} detail={`${book.lowest.manager} vs ${book.lowest.opponent}, ${when(book.lowest)}`} />
        <StatTile label="Biggest blowout" value={`+${fmt(book.blowout.pf - book.blowout.pa)}`} detail={`${versus(book.blowout)}, ${when(book.blowout)}`} />
        <StatTile label="Closest game" value={`+${fmt(book.closest.pf - book.closest.pa)}`} detail={`${versus(book.closest)}, ${when(book.closest)}`} />
        <StatTile label="Highest combined" value={fmt(book.combined.pf + book.combined.pa)} detail={`${versus(book.combined)}, ${when(book.combined)}`} />
        <StatTile label="Longest win streak" value={book.longestWin.length} detail={`${book.longestWin.manager}, ${book.longestWin.from} → ${book.longestWin.to}`} />
        <StatTile label="Longest losing streak" value={book.longestLoss.length} detail={`${book.longestLoss.manager}, ${book.longestLoss.from} → ${book.longestLoss.to}`} />
        <StatTile
          label="Hottest right now"
          value={`${book.currentStreaks[0].kind}${book.currentStreaks[0].length}`}
          detail={`${book.currentStreaks[0].manager}, since ${book.currentStreaks[0].from}`}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top 10 single-week scores">
          <ChartContainer config={config} className="aspect-auto h-80 w-full">
            <BarChart data={topScores} layout="vertical" barCategoryGap={4} margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="key" tickLine={false} axisLine={false} width={96} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelFormatter={(_, p) => `${p?.[0]?.payload.manager} vs ${p?.[0]?.payload.opponent}, ${p?.[0]?.payload.when}`} />}
              />
              <Bar dataKey="pf" fill="var(--color-pf)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </Panel>
        <Panel title="Top 10 blowouts">
          <SimpleTable
            head={["Winner", "Score", "Loser", "Margin", "When"]}
            align={["left", "right", "left", "right", "left"]}
            rows={book.topBlowouts.map((g) => [
              g.manager,
              `${fmt(g.pf)} – ${fmt(g.pa)}`,
              g.opponent,
              `+${fmt(g.pf - g.pa)}`,
              `${g.year} ${g.short}`,
            ])}
          />
        </Panel>
      </div>
      <Panel title="Current streaks" description="Active managers, across seasons and including playoffs.">
        <SimpleTable
          head={["Manager", "Streak", "Since"]}
          align={["left", "right", "left"]}
          rows={book.currentStreaks.map((s) => [s.manager, `${s.kind}${s.length}`, s.from])}
        />
      </Panel>
    </div>
  )
}
