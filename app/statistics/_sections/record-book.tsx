"use client"

import type { GameLine, SeasonLine, recordBook, seasonRecords } from "../_lib/stats"
import { Panel, SimpleTable, StatTile, TileGrid, fmt } from "../_components/ui"

type Book = ReturnType<typeof recordBook>

const when = (g: GameLine) => `${g.year} ${g.label}`
const versus = (g: GameLine) => `${g.manager} ${fmt(g.pf)} – ${fmt(g.pa)} ${g.opponent}`

// Single-game records, all-time. Double weeks are left out, since they cover two NFL weeks.
export function SingleGames({ book, highlighted }: { book: Book; highlighted: string | null }) {
  return (
    <div className="grid gap-4">
      <TileGrid>
        <StatTile label="Highest score" value={fmt(book.highest.pf)} detail={`${book.highest.manager} vs ${book.highest.opponent}, ${when(book.highest)}`} />
        <StatTile label="Lowest score" value={fmt(book.lowest.pf)} detail={`${book.lowest.manager} vs ${book.lowest.opponent}, ${when(book.lowest)}`} />
        <StatTile label="Biggest blowout" value={`+${fmt(book.blowout.pf - book.blowout.pa)}`} detail={`${versus(book.blowout)}, ${when(book.blowout)}`} />
        <StatTile label="Closest game" value={`+${fmt(book.closest.pf - book.closest.pa)}`} detail={`${versus(book.closest)}, ${when(book.closest)}`} />
        <StatTile label="Highest combined" value={fmt(book.combined.pf + book.combined.pa)} detail={`${versus(book.combined)}, ${when(book.combined)}`} />
        <StatTile label="Lowest combined" value={fmt(book.lowestCombined.pf + book.lowestCombined.pa)} detail={`${versus(book.lowestCombined)}, ${when(book.lowestCombined)}`} />
        <StatTile label="Highest score in a loss" value={fmt(book.highestLoss.pf)} detail={`${book.highestLoss.manager} lost to ${book.highestLoss.opponent} (${fmt(book.highestLoss.pa)}), ${when(book.highestLoss)}`} />
        <StatTile label="Lowest score in a win" value={fmt(book.lowestWin.pf)} detail={`${book.lowestWin.manager} beat ${book.lowestWin.opponent} (${fmt(book.lowestWin.pa)}), ${when(book.lowestWin)}`} />
      </TileGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top 10 single-week scores">
          <SimpleTable
            head={["#", "Manager", "Score", "Opponent", "When"]}
            align={["left", "left", "right", "left", "left"]}
            highlight={(i) => book.topScores[i].manager === highlighted}
            rows={book.topScores.map((g, i) => [i + 1, g.manager, fmt(g.pf), `${g.opponent} (${fmt(g.pa)})`, `${g.year} ${g.short}`])}
          />
        </Panel>
        <Panel title="Top 10 blowouts">
          <SimpleTable
            head={["Winner", "Score", "Loser", "Margin", "When"]}
            align={["left", "right", "left", "right", "left"]}
            highlight={(i) => book.topBlowouts[i].manager === highlighted}
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
    </div>
  )
}

const season = (l: SeasonLine) => `${l.manager}, ${l.year} (${l.record})`
const signed = (x: number) => `${x > 0 ? "+" : ""}${fmt(x, 1)}`

// Best and worst regular seasons, in pairs
export function SeasonRecords({ records }: { records: NonNullable<ReturnType<typeof seasonRecords>> }) {
  return (
    <TileGrid>
      <StatTile label="Best record" value={records.best.record} detail={`${records.best.manager}, ${records.best.year}`} />
      <StatTile label="Worst record" value={records.worst.record} detail={`${records.worst.manager}, ${records.worst.year}`} />
      <StatTile label="Highest PPG" value={fmt(records.highestPpg.ppg)} detail={season(records.highestPpg)} />
      <StatTile label="Lowest PPG" value={fmt(records.lowestPpg.ppg)} detail={season(records.lowestPpg)} />
      <StatTile label="Most points against per game" value={fmt(records.highestPapg.papg)} detail={season(records.highestPapg)} />
      <StatTile label="Fewest points against per game" value={fmt(records.lowestPapg.papg)} detail={season(records.lowestPapg)} />
      <StatTile label="Luckiest season" value={`${signed(records.luckiest.luck)} wins`} detail={season(records.luckiest)} />
      <StatTile label="Unluckiest season" value={`${signed(records.unluckiest.luck)} wins`} detail={season(records.unluckiest)} />
    </TileGrid>
  )
}

// The longest streaks ever, then everyone's current one. Streaks run across seasons and include
// the playoffs.
export function Streaks({ book, highlighted }: { book: Book; highlighted: string | null }) {
  return (
    <div className="grid gap-4">
      <TileGrid>
        <StatTile label="Longest win streak" value={book.longestWin.length} detail={`${book.longestWin.manager}, ${book.longestWin.from} → ${book.longestWin.to}`} />
        <StatTile label="Longest losing streak" value={book.longestLoss.length} detail={`${book.longestLoss.manager}, ${book.longestLoss.from} → ${book.longestLoss.to}`} />
        {book.snapper && (
          <StatTile
            label="Streak snapper"
            value={book.snapper.count}
            detail={`${book.snapper.manager}: wins over a team on a 3+ game win streak. Biggest: ${book.snapper.biggest.opponent}'s ${book.snapper.biggest.length} (${book.snapper.biggest.when})`}
          />
        )}
        {book.hotCold && (
          <StatTile
            label="Hot and cold"
            value={`${Math.round(book.hotCold.rate * 100)}%`}
            detail={`${book.hotCold.manager}: a different result from the game before in ${book.hotCold.flips} of ${book.hotCold.of} games`}
          />
        )}
      </TileGrid>
      <Panel title="Current streaks" description="Every active manager's run, hottest first.">
        <SimpleTable
          head={["Manager", "Streak", "Since"]}
          align={["left", "right", "left"]}
          highlight={(i) => book.currentStreaks[i].manager === highlighted}
          rows={book.currentStreaks.map((s) => [s.manager, `${s.kind}${s.length}`, s.from])}
        />
      </Panel>
    </div>
  )
}
