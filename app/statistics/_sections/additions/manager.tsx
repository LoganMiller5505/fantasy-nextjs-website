"use client"

import { Panel, Section, SimpleTable, fmt } from "../../_components/ui"
import type { ManagerAdditionsData } from "../../_lib/espn/additions"
import type { DraftPickRow } from "../../_lib/espn/draft"
import type { MoveRow } from "../../_lib/espn/moves"

const percent = (x: number) => `${(100 * x).toFixed(1)}%`
const signed = (x: number) => (x > 0 ? `+${x.toFixed(1)}` : x.toFixed(1))
const pick = (p: DraftPickRow) => [`${p.year} ${p.round}.${String(p.round_pick).padStart(2, "0")}`, p.name, `${p.position}${p.drafted} → ${p.position}${p.finished}`, p.value > 0 ? `+${p.value}` : String(p.value)]
const move = (m: MoveRow) => [
  `${m.year} ${m.week}`,
  `${m.added.name} (${fmt(m.added.points, 1)})`,
  m.dropped.map((d) => `${d.name} (${fmt(d.points, 1)})`).join(", ") || "—",
  signed(m.net),
]

// One manager's ESPN story: each season's team, lineups and moves, their best players, and the
// best and worst of their drafts, adds and trades
export function ManagerAdditions({ manager, data }: { manager: string; data: ManagerAdditionsData }) {
  const { seasons, mvps, bestPicks, worstPicks, habits, bestMoves, worstMoves, trades } = data
  return (
    <Section title={`${manager} on ESPN`} description="From ESPN's rosters, lineups, draft and transactions.">
      <Panel
        title="Seasons on ESPN"
        description="Each season's team name, lineups and moves, and ESPN's draft-day projection against the finish."
        method="Efficiency and Vs proj are regular season, as on Lineups and Luck. Dead starts are starters on bye, ruled out or with no game. Finish is the final place once a season is over, the standings so far before that."
      >
        <SimpleTable
          head={["Season", "Team", "Efficiency", "Vs proj/wk", "Dead starts", "Projected", "Finish", "Adds", "Trades"]}
          align={["left", "left", "right", "right", "right", "right", "right", "right", "right"]}
          rows={seasons.map((s) => [
            s.year,
            s.team,
            s.efficiency == null ? "—" : percent(s.efficiency),
            s.vsProjection == null ? "—" : signed(s.vsProjection),
            s.deadStarts,
            s.projected ?? "—",
            s.finish == null ? "—" : s.final ? s.finish : `${s.finish} so far`,
            s.adds,
            s.trades,
          ])}
        />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="All-time MVPs" description="The players who've scored the most in their lineup, regular season.">
          <SimpleTable
            head={["Player", "Pts", "Starts", "Seasons"]}
            align={["left", "right", "right", "left"]}
            rows={mvps.map((p) => [`${p.name} (${p.position})`, fmt(p.points, 1), p.starts, p.seasons])}
          />
        </Panel>
        {habits && (
          <Panel title="Draft habits" description="Their averages against the league's, from the Draft & moves tab.">
            <SimpleTable
              head={["Habit", manager, "League"]}
              align={["left", "right", "right"]}
              rows={habits.columns.map((c, i) => [c, habits.values[i] == null ? "—" : fmt(habits.values[i]!, 1), fmt(habits.average[i], 1)])}
            />
          </Panel>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Best draft picks" description="By where he was taken at his position against where he finished. Kickers and defenses left out.">
          <SimpleTable head={["Pick", "Player", "Drafted → finished", "Value"]} align={["left", "left", "left", "right"]} rows={bestPicks.map(pick)} />
        </Panel>
        <Panel title="Worst draft picks" description="By the same measure, worst first.">
          <SimpleTable head={["Pick", "Player", "Drafted → finished", "Value"]} align={["left", "left", "left", "right"]} rows={worstPicks.map(pick)} />
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Best pickups" description="Adds by points in the lineup, less what the dropped player scored for rivals.">
          {bestMoves.length ? (
            <SimpleTable head={["Week", "Added", "Dropped", "Net"]} align={["left", "left", "left", "right"]} rows={bestMoves.map(move)} />
          ) : (
            <p className="text-muted-foreground text-sm">No waiver or free-agent adds.</p>
          )}
        </Panel>
        <Panel title="Worst pickups" description="By the same measure, worst first.">
          {worstMoves.length ? (
            <SimpleTable head={["Week", "Added", "Dropped", "Net"]} align={["left", "left", "left", "right"]} rows={worstMoves.map(move)} />
          ) : (
            <p className="text-muted-foreground text-sm">No waiver or free-agent adds.</p>
          )}
        </Panel>
      </div>
      {trades.length > 0 && (
        <Panel title="Trades" description="Every trade, by its margin: what their new players scored in their lineup, less what the other side's did.">
          <SimpleTable
            head={["When", "With", "Got", "Gave", "Margin"]}
            align={["left", "left", "left", "left", "right"]}
            rows={trades.map((t) => [`${t.year} ${t.week}`, t.partners.join(", "), t.received.join(", "), t.gave.join(", "), signed(t.margin)])}
          />
        </Panel>
      )}
    </Section>
  )
}
