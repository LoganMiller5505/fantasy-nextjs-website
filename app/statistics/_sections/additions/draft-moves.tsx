"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { DataTable } from "../../_components/data-table"
import { type DataTableFeatures } from "../../_components/data-table-features"
import { when } from "../../_components/scope"
import { SortableHeader, numeric } from "../../_components/table-helpers"
import { HeatTable, ManagerLink, Panel, Section, SimpleTable, diverging, fmt } from "../../_components/ui"
import type { DraftTabData } from "../../_lib/espn/additions"
import type { ChurnRow, ClaimRow, MarketRow, StreamingRow } from "../../_lib/espn/moves"
import type { Scope } from "../../_lib/stats"
import { BestWorstSection } from "../best-worst"
import { DraftSection } from "../draft"
import { MovesSection } from "../moves"

// A sortable per-manager table: the manager column, then numeric columns
function managerTable<T extends { player: string }>(keys: readonly (keyof T & string)[], format: Partial<Record<string, (x: number) => string>> = {}) {
  const helper = createColumnHelper<DataTableFeatures, T>()
  return helper.columns([
    helper.accessor((r) => r.player, {
      id: "player",
      header: ({ column }) => <SortableHeader column={column} title="Manager" />,
      enableHiding: false,
      filterFn: "excludes",
      cell: ({ getValue }) => <ManagerLink manager={String(getValue())} />,
    }),
    ...keys.map((key) =>
      helper.accessor((r) => r[key] as number, {
        id: key,
        header: ({ column }) => <SortableHeader column={column} title={key} />,
        ...numeric,
        ...(format[key] && { cell: ({ getValue }) => format[key]!(Number(getValue())) }),
      })
    ),
  ])
}

const one = (x: number) => fmt(x, 1)
const claimColumns = managerTable<ClaimRow>(["Claims", "Won", "Beaten to it", "Failed", "Cancelled", "Win %"], { "Win %": (x) => `${fmt(x, 0)}%` })
const marketColumns = managerTable<MarketRow>(["Proposed", "Received", "Declined", "Withdrawn", "Completed", "Vetoes", "Upholds"])
const churnColumns = managerTable<ChurnRow>(["Seasons", "Players used", "Started", "Kept all season"], { "Players used": one, Started: one, "Kept all season": one })
const streamColumns = managerTable<StreamingRow>(["K used", "K/wk", "D/ST used", "D/ST/wk"], { "K/wk": one, "D/ST/wk": one })

// The draft, then the moves since, the talk and churn behind them, then the best and worst of both
export function DraftMovesSections({ data, scope, highlighted }: { data: DraftTabData; scope: Scope; highlighted: string | null }) {
  const key = String(scope)
  // A draft is one season's: all-time shows the latest one
  const draftYear = scope === "all" ? Math.max(...Object.keys(data.drafts).map(Number)) : scope
  const { habits, claims, market, churn, travelers, streaming } = data.more[key]
  const habitLimits = habits.columns.map((_, i) =>
    Math.max(...habits.rows.map((r) => (r.values[i] == null ? 0 : Math.abs(r.values[i]! - habits.average[i]))))
  )

  return (
    <>
      <DraftSection data={data.drafts[draftYear]} latestOnly={scope === "all"} />
      <Section title="Draft habits">
        <Panel
          title="How each manager drafts"
          description="The round each position first goes, how many RBs and WRs go in the first five rounds, and picks ESPN marks as auto-drafted. Blue is above the league average, red below."
          method="Rounds and counts are averaged over each manager's drafts in the span; Auto picks is a total. ESPN doesn't document its auto-draft marker, so read Auto picks as ESPN's flag rather than a certain count of missed picks."
        >
          <HeatTable
            corner="Manager"
            columns={habits.columns}
            highlight={(m) => m === highlighted}
            rows={habits.rows.map((r) => ({
              key: r.manager,
              label: r.manager,
              cells: r.values.map((v, i) =>
                v == null
                  ? { text: "", t: null }
                  : {
                      text: Number.isInteger(v) ? String(v) : fmt(v, 1),
                      ...diverging(v - habits.average[i], habitLimits[i]),
                      title: `${r.manager}, ${habits.columns[i]}: ${fmt(v, 1)} (league average ${fmt(habits.average[i], 1)})`,
                    }
              ),
            }))}
          />
        </Panel>
      </Section>
      <MovesSection data={data.moves[key]} scope={scope} highlighted={highlighted} />
      <Section title="Waivers and trade talk" description="The claims and offers behind the moves, including the ones that didn't happen.">
        <Panel
          title="Waiver claims"
          description="Every claim that ran, and how it went. Most claims first."
          method="Won: the claim went through. Beaten to it: another team's claim on the player went first. Failed: the claim broke a rule when it ran, such as a drop who was already gone or a full roster. Win % counts claims that ran (won, beaten or failed). Claims still pending when a season ended are left out."
        >
          <DataTable columns={claimColumns} data={claims.rows} initialSorting={[{ id: "Claims", desc: true }]} highlight={(r) => r.player === highlighted} phoneHidden={["Failed", "Cancelled"]} />
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Most contested players" description="Players more than one team claimed in the same week, and who got them.">
            {claims.contested.length ? (
              <SimpleTable
                head={["Week", "Player", "Claimed by", "Went to"]}
                align={["left", "left", "left", "left"]}
                highlight={(i) => claims.contested[i].winner === highlighted}
                rows={claims.contested.map((c) => [when(scope, c.year, c.week), c.name, c.claimants.join(", "), c.winner ?? "Nobody"])}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No player drew more than one claim in this span.</p>
            )}
          </Panel>
          <Panel
            title="Trade talk"
            description="Proposals made and received, how they ended, and votes on other teams' trades."
            method="From ESPN's trade events. Received counts proposals that included the manager's players. Declined and Withdrawn are the manager's own actions; Vetoes and Upholds are votes cast on trades between other teams. A proposal can be sent more than once, so counts are events rather than distinct deals."
          >
            <DataTable columns={marketColumns} data={market} initialSorting={[{ id: "Proposed", desc: true }]} highlight={(r) => r.player === highlighted} phoneHidden={["Withdrawn", "Upholds"]} />
          </Panel>
        </div>
      </Section>
      <Section title="Roster churn" description="How much each roster turned over, the players who got around, and who streams kickers and defenses.">
        <Panel
          title="Turnover"
          description="Distinct players on each roster and in each lineup, and players kept all season. All-time figures are per season."
          method="Regular-season weeks ESPN has closed. Kept all season: on the roster every one of those weeks."
        >
          <DataTable columns={churnColumns} data={churn} initialSorting={[{ id: "Players used", desc: true }]} highlight={(r) => r.player === highlighted} />
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Most-traveled players" description="Players who passed through the most rosters in one season, in the order they moved.">
            {travelers.length ? (
              <SimpleTable
                head={["Season", "Player", "Rosters"]}
                align={["left", "left", "left"]}
                highlight={(i) => highlighted != null && travelers[i].managers.includes(highlighted)}
                rows={travelers.map((t) => [t.year, `${t.name} (${t.position})`, t.managers.join(" → ")])}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No player was on more than two rosters in one season here.</p>
            )}
          </Panel>
          <Panel
            title="Streaming"
            description="Distinct kickers and defenses started, and what they scored a week."
            method="Distinct players started at K and D/ST in the regular season, counted per season and added up; points are per week."
          >
            <DataTable columns={streamColumns} data={streaming} initialSorting={[{ id: "D/ST used", desc: true }]} highlight={(r) => r.player === highlighted} />
          </Panel>
        </div>
      </Section>
      <BestWorstSection data={data.bestWorst[key]} scope={scope} highlighted={highlighted} />
    </>
  )
}
