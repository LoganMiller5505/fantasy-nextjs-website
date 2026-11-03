"use client"

import * as React from "react"
import { createColumnHelper } from "@tanstack/react-table"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { Segmented, when } from "../_components/scope"
import { SortableHeader, numeric } from "../_components/table-helpers"
import { ManagerLink, Panel, Section, SimpleTable, fmt } from "../_components/ui"
import type { DraftGradeRow, DraftMeasure, DraftPickRow, draftExtremes } from "../_lib/espn/draft"
import type { pickupMoves, tradeExtremes, tradeRecords } from "../_lib/espn/moves"
import type { Scope } from "../_lib/stats"
import { slot } from "./draft"

export type BestWorstData = {
  moves: ReturnType<typeof pickupMoves>
  draft: ReturnType<typeof draftExtremes>
  grades: DraftGradeRow[]
  trades: ReturnType<typeof tradeExtremes>
  tradeRecords: ReturnType<typeof tradeRecords>
}

type End = "Best" | "Worst"
const ENDS: End[] = ["Best", "Worst"]
const ofEnd = <T,>(lists: { best: T[]; worst: T[] }, end: End) => (end === "Best" ? lists.best : lists.worst)
const MEASURES: DraftMeasure[] = ["season", "lineup"]
const measureLabel = (m: DraftMeasure) => (m === "season" ? "Full season" : "In lineup")
const signed = (x: number, places = 1) => (x > 0 ? `+${x.toFixed(places)}` : x.toFixed(places))
const none = <p className="text-muted-foreground text-sm">Nothing in this span.</p>

const columnHelper = createColumnHelper<DataTableFeatures, DraftGradeRow>()
const numberKeys = ["Picks", "Avg value", "Avg lineup value", "Hit %"] as const

const gradeColumns = columnHelper.columns([
  columnHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Manager" />,
    enableHiding: false,
    filterFn: "excludes",
    cell: ({ getValue }) => <ManagerLink manager={String(getValue())} />,
  }),
  ...numberKeys.map((key) =>
    columnHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...numeric,
      ...((key === "Avg value" || key === "Avg lineup value") && { cell: ({ getValue }) => signed(Number(getValue())) }),
      ...(key === "Hit %" && { cell: ({ getValue }) => `${fmt(Number(getValue()), 0)}%` }),
    })
  ),
  ...(["Best", "Worst"] as const).map((key) =>
    columnHelper.accessor(key, { header: ({ column }) => <SortableHeader column={column} title={key} /> })
  ),
])

export function BestWorstSection({ data, scope, highlighted }: { data: BestWorstData; scope: Scope; highlighted: string | null }) {
  const [moveEnd, setMoveEnd] = React.useState<End>("Best")
  const [pickEnd, setPickEnd] = React.useState<End>("Best")
  const [measure, setMeasure] = React.useState<DraftMeasure>("season")
  const [tradeEnd, setTradeEnd] = React.useState<End>("Best")

  const moves = ofEnd(data.moves, moveEnd)
  const picks = data.draft[measure][pickEnd === "Best" ? "steals" : "busts"]
  const trades = ofEnd(data.trades, tradeEnd)
  const records = data.tradeRecords
  const pickYear = (p: DraftPickRow) => (scope === "all" ? `${p.year} ` : "")

  return (
    <Section title="Best and worst moves" description="The adds, picks and trades that did the most for a roster, and the most damage.">
      <Panel
        title="Waiver and free-agent moves"
        description="Each add, less what the player dropped for it went on to score for rivals."
        method="Added: points the new player scored in the lineup of the manager who added him, until that manager added him again (a new move). Dropped: points the dropped player then scored in other managers' lineups that season. Net is added minus dropped. Playoffs included."
        controls={<Segmented label="Best or worst moves" size="sm" options={ENDS} value={moveEnd} onChange={setMoveEnd} />}
      >
        {moves.length ? (
          <SimpleTable
            head={["Week", "Manager", "Added", "Dropped", "Net"]}
            align={["left", "left", "left", "left", "right"]}
            highlight={(i) => moves[i].manager === highlighted}
            rows={moves.map((m) => [
              when(scope, m.year, m.week),
              m.manager,
              `${m.added.name} (${fmt(m.added.points, 1)} in ${m.added.starts} starts)`,
              m.dropped.length
                ? m.dropped.map((d) => `${d.name} (${fmt(d.points, 1)}${d.by.length ? ` for ${d.by.join(", ")}` : ""})`).join("; ")
                : "—",
              signed(m.net),
            ])}
          />
        ) : (
          none
        )}
      </Panel>
      <Panel
        title={pickEnd === "Best" ? "Draft steals" : "Draft busts"}
        description={
          measure === "season"
            ? "Picks against where they finished at their position in full-season points, whoever had them."
            : "Picks against where they ranked among their position's draftees in points for the lineup that drafted them."
        }
        method="A pick's value is where he was taken among his position (the 5th RB off the board is RB5) less where he finished. Full season ranks him among every player at his position; In lineup ranks him among that draft's picks at his position by points as a starter for his drafter, so a steal who was cut early doesn't count. Busts come from the first half of the draft. Kickers and defenses are left out."
        controls={
          <>
            <Segmented label="Steals or busts" size="sm" options={ENDS} value={pickEnd} onChange={setPickEnd} format={(e) => (e === "Best" ? "Steals" : "Busts")} />
            <Segmented label="Measured by" size="sm" options={MEASURES} value={measure} onChange={setMeasure} format={measureLabel} />
          </>
        }
      >
        {picks.length ? (
          <SimpleTable
            head={["Pick", "Manager", "Player", "Drafted", "Finished", measure === "season" ? "Pts" : "Lineup pts"]}
            align={["left", "left", "left", "right", "right", "right"]}
            highlight={(i) => picks[i].manager === highlighted}
            rows={picks.map((p) => [
              `${pickYear(p)}${slot(p)}`,
              p.manager,
              p.name,
              `${p.position}${p.drafted}`,
              `${p.position}${measure === "season" ? p.finished : p.lineupFinish}`,
              fmt(measure === "season" ? p.points : p.forTeam, 1),
            ])}
          />
        ) : (
          none
        )}
      </Panel>
      <Panel
        title="Draft grades"
        description="How each manager's first-half picks turned out, by the same values. Best drafter first."
        method="Averages over first-half picks, kickers and defenses aside. Hit %: picks that finished at or above where they were taken (full season). Best and Worst are by full-season value. Full-season values run below zero on average, because breakout pickups and late picks push early picks down the finishing order; compare managers with each other rather than with zero."
      >
        <DataTable
          columns={gradeColumns}
          data={data.grades}
          initialSorting={[{ id: "Avg value", desc: true }]}
          highlight={(r) => r.player === highlighted}
          phoneHidden={["Picks", "Hit %"]}
        />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={tradeEnd === "Best" ? "Trade wins" : "Trade losses"}
          description="Each side of a trade by its margin: what its new players scored in its lineup, less what the other side's did."
          method="Points count weeks after the trade in which a player started for the manager who received him, playoffs included. In a three-way deal the margin is against the average of the other sides."
          controls={<Segmented label="Wins or losses" size="sm" options={ENDS} value={tradeEnd} onChange={setTradeEnd} format={(e) => (e === "Best" ? "Wins" : "Losses")} />}
        >
          {trades.length ? (
            <SimpleTable
              head={["When", "Manager", "Got", "Gave", "Margin"]}
              align={["left", "left", "left", "left", "right"]}
              highlight={(i) => trades[i].manager === highlighted}
              rows={trades.map((t) => [
                when(scope, t.year, t.week),
                `${t.manager} with ${t.partners.join(", ")}`,
                t.received.join(", "),
                t.gave.join(", "),
                signed(t.margin),
              ])}
            />
          ) : (
            none
          )}
        </Panel>
        <Panel title="Trade records" description="Trades won and lost by margin, and the net. Best trader first.">
          {records.length ? (
            <SimpleTable
              head={["Manager", "Trades", "W-L", "Net"]}
              align={["left", "right", "right", "right"]}
              highlight={(i) => records[i].manager === highlighted}
              rows={records.map((r) => [r.manager, r.trades, `${r.won}-${r.lost}`, signed(r.net)])}
            />
          ) : (
            none
          )}
        </Panel>
      </div>
    </Section>
  )
}
