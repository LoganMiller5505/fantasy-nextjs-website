"use client"

import { when } from "../../_components/scope"
import { HeatTable, Panel, Section, SimpleTable, diverging, fmt } from "../../_components/ui"
import type { ScoringAdditionsData } from "../../_lib/espn/additions"
import type { Scope } from "../../_lib/stats"
import { PositionScoring } from "../position-scoring"

// Where each lineup's points come from: by slot and player, by kind of stat, the biggest weeks,
// QB stacks, and each manager's favourite NFL team
export function ScoringAdditions({ data, scope, highlighted }: { data: ScoringAdditionsData; scope: Scope; highlighted: string | null }) {
  const { categories, games, stacks, fandom } = data
  const columns = [...categories.columns, "TD share"]
  const average = [...categories.average, categories.tdAverage]
  const values = (r: (typeof categories.rows)[number]) => [...r.values, r.tdShare]
  // Each column's full colour is its biggest gap from the league average
  const limits = columns.map((_, i) => Math.max(...categories.rows.map((r) => Math.abs(values(r)[i] - average[i]))))

  return (
    <Section title="Where the points come from">
      <PositionScoring data={data} highlighted={highlighted} />
      <Panel
        title="How points are scored"
        description="Starters' points per week from each kind of stat, and touchdowns' share of the total. Blue is above the league average, red below."
        method="From ESPN's per-stat scoring for every starter. Yards, receptions and touchdowns are the skill players' (a 2-point conversion counts as Other); kickers and defenses count whole; Turnovers are interceptions thrown and fumbles lost, so they're negative. Touchdowns swing more from year to year than yards and catches, so a team leaning on them is the likeliest to cool off. Regular season only."
      >
        <HeatTable
          corner="Manager"
          columns={columns}
          highlight={(m) => m === highlighted}
          rows={categories.rows.map((r) => ({
            key: r.manager,
            label: r.manager,
            cells: values(r).map((v, i) => ({
              text: i === columns.length - 1 ? `${fmt(v, 1)}%` : fmt(v, 1),
              ...diverging(v - average[i], limits[i]),
              title: `${r.manager}: ${fmt(v, 1)}${i === columns.length - 1 ? "% of points from touchdowns" : ` a week from ${columns[i].toLowerCase()}`} (league average ${fmt(average[i], 1)})`,
            })),
          }))}
        />
      </Panel>
      <Panel title="Biggest player games" description="The best single weeks by a starter.">
        <SimpleTable
          head={["Week", "Manager", "Player", "Pts", "Projected"]}
          align={["left", "left", "left", "right", "right"]}
          highlight={(i) => games[i].manager === highlighted}
          rows={games.map((g) => [when(scope, g.year, g.week), g.manager, `${g.name} (${g.position})`, fmt(g.points, 1), g.projected == null ? "—" : fmt(g.projected, 1)])}
        />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Stacks"
          description="Weeks a manager started a QB with a WR or TE from the same NFL team, and how those weeks scored. Most stacked first."
          method="Stack pts: the stacked QB and pass catchers' points in a stacked week. Pts stacked and Pts otherwise: the whole lineup's points in weeks with and without a stack. Regular season only."
        >
          <SimpleTable
            head={["Manager", "Stacked", "Stack pts", "Pts stacked", "Pts otherwise"]}
            align={["left", "right", "right", "right", "right"]}
            highlight={(i) => stacks.rows[i].player === highlighted}
            rows={stacks.rows.map((r) => [r.player, `${r.Stacked} of ${r.Weeks}`, r.Stacked ? fmt(r["Stack pts"], 1) : "—", r.Stacked ? fmt(r["Pts stacked"], 1) : "—", fmt(r["Pts otherwise"], 1)])}
          />
        </Panel>
        <Panel title="Best stacks" description="The highest-scoring QB and pass-catcher stacks in one week.">
          {stacks.best.length ? (
            <SimpleTable
              head={["Week", "Manager", "Stack", "Pts"]}
              align={["left", "left", "left", "right"]}
              highlight={(i) => stacks.best[i].manager === highlighted}
              rows={stacks.best.map((b) => [when(scope, b.year, b.week), b.manager, `${b.qb} + ${b.catchers.join(", ")} (${b.team})`, fmt(b.points, 1)])}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No stacks in this span.</p>
          )}
        </Panel>
      </div>
      <Panel
        title="Favourite NFL teams"
        description="The NFL team whose players scored the most in each manager's lineup. Most loyal first."
        method="Each starter's points count for his NFL team that week, so a player traded mid-season counts for both teams. Share is that team's part of the manager's starter points; Teams counts every NFL team they started a player from. Regular season only."
      >
        <SimpleTable
          head={["Manager", "Team", "Share", "Pts", "Starts", "Next", "Teams"]}
          align={["left", "left", "right", "right", "right", "left", "right"]}
          highlight={(i) => fandom[i].manager === highlighted}
          rows={fandom.map((f) => [f.manager, f.team, `${fmt(f.share, 1)}%`, fmt(f.points, 1), f.starts, f.runnerUp ?? "—", f.teams])}
        />
      </Panel>
    </Section>
  )
}
