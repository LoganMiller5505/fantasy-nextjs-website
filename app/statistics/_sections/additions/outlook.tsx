"use client"

import { HeatTable, Panel, Section, SimpleTable, fmt } from "../../_components/ui"
import type { OutlookAdditionsData } from "../../_lib/espn/additions"

const signed = (x: number) => (x > 0 ? `+${x.toFixed(1)}` : x.toFixed(1))

// The rest of the season as ESPN sees it: this week's projected games, each roster's strength for
// the weeks left, and the byes ahead
export function OutlookAdditions({ data, highlighted }: { data: OutlookAdditionsData; highlighted: string | null }) {
  const { thisWeek, restOfSeason, byes } = data
  if (!thisWeek && !restOfSeason && !byes) return null
  const maxOut = byes ? Math.max(1, ...byes.rows.flatMap((r) => r.out.map((o) => o.length))) : 1

  return (
    <Section title="Per ESPN" description="ESPN's projections for the games and weeks still to come.">
      {thisWeek && (
        <Panel
          title={`This week's projections · ${thisWeek.week}`}
          description={
            thisWeek.current
              ? "Each game as ESPN projects it from the lineups set, with the score so far once games start."
              : `ESPN has no lineups for this week yet, so these use the ${thisWeek.lineupsFrom} lineups.`
          }
          method="A team's projection is ESPN's projections for its starters, added up. Projections move with injury news until kickoff; this is as of the last ESPN sync."
        >
          <SimpleTable
            head={["Game", "Projected", "Favourite", "Score"]}
            align={["left", "right", "left", "right"]}
            highlight={(i) => thisWeek.games[i].home === highlighted || thisWeek.games[i].away === highlighted}
            rows={thisWeek.games.map((g) => [
              `${g.home} vs ${g.away}`,
              `${fmt(g.homeProj, 1)}–${fmt(g.awayProj, 1)}`,
              g.homeProj === g.awayProj ? "Even" : `${g.homeProj > g.awayProj ? g.home : g.away} by ${fmt(Math.abs(g.homeProj - g.awayProj), 1)}`,
              g.homePts == null && g.awayPts == null ? "—" : `${fmt(g.homePts ?? 0, 1)}–${fmt(g.awayPts ?? 0, 1)}`,
            ])}
          />
        </Panel>
      )}
      {restOfSeason && (
        <Panel
          title="Strength for the rest of the season"
          description="Each current roster's best lineup by ESPN's season-long projections, per game, against what it has scored a week so far. Strongest first."
          method="For each team's current roster, the best lineup by ESPN's projected points per game, from its current full-season projection for each player (17 games). It ignores byes and injuries to come, so it runs above real weekly scores; compare teams with each other."
        >
          <SimpleTable
            head={["Manager", "Projected/wk", "So far/wk", "Change", "Projected rank", "Standing"]}
            align={["left", "right", "right", "right", "right", "right"]}
            highlight={(i) => restOfSeason[i].manager === highlighted}
            rows={restOfSeason.map((r) => [r.manager, fmt(r.projected, 1), fmt(r.actual, 1), signed(r.change), r.projectedRank, r.standing || "—"])}
          />
        </Panel>
      )}
      {byes && (
        <Panel
          title="Bye-week crunch"
          description="How many of each team's current starters are on bye in each regular-season week left."
          method="Starters are the players in each team's latest ESPN lineup; byes are by their current NFL team."
        >
          <HeatTable
            corner="Manager"
            columns={byes.weeks}
            highlight={(m) => m === highlighted}
            rows={byes.rows.map((r) => ({
              key: r.manager,
              label: r.manager,
              cells: r.out.map((names, i) => ({
                text: names.length ? String(names.length) : "",
                t: names.length ? names.length / maxOut : null,
                tone: "red" as const,
                title: names.length ? `${r.manager}, ${byes.weeks[i]}: ${names.join(", ")} on bye` : undefined,
              })),
            }))}
          />
        </Panel>
      )}
    </Section>
  )
}
