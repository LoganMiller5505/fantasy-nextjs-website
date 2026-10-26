"use client"

import * as React from "react"
import { createColumnHelper } from "@tanstack/react-table"
import { cn } from "cn"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { SortableHeader, sortFn_numeric } from "../_components/table-helpers"
import type { Award, Halves, SeasonStory as Story, WeekAwards, WeekResult, strongFinish } from "../_lib/stats"
import { Detail, HighlightLines, Legend, PICK_HINT, highlightLegend, Panel, SERIES, SimpleTable, fmt } from "../_components/ui"

function Chip({ result, label }: { result: WeekResult; label: string }) {
  const text = result === "bye" ? "–" : result ?? "·"
  return (
    <span
      title={`${label}: ${result === "bye" ? "no game" : result ?? "not played yet"}`}
      aria-label={`${label}: ${result === "bye" ? "no game" : result === "W" ? "win" : result === "L" ? "loss" : "not played yet"}`}
      role="img"
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-[4px] text-[10px] font-semibold",
        result === "W" && "bg-foreground text-background",
        result === "L" && "bg-muted text-muted-foreground",
        (result === "bye" || result == null) && "text-muted-foreground/60"
      )}
    >
      {text}
    </span>
  )
}

export function Standings({ story, highlighted }: { story: Story; highlighted: string | null }) {
  return (
    <Panel
      title={`${story.year} standings`}
      description="Regular-season record and points, then every week of the season as a win or loss."
      method="W-L, PF and PA are regular season only. The weeks run through the playoffs, consolation games included: – is a bye and · a game still to play."
    >
      <SimpleTable
        head={["#", "Manager", "W-L", "PF", "PA", "Weeks"]}
        align={["left", "left", "right", "right", "right", "left"]}
        highlight={(i) => story.standings[i].manager === highlighted}
        rows={story.standings.map((row, i) => [
          i + 1,
          row.manager,
          `${row.wins}-${row.losses}`,
          fmt(row.pf),
          fmt(row.pa),
          <div key="chips" className="flex gap-0.5">
            {row.results.map((r, w) => (
              <Chip key={w} result={r} label={story.weekLabels[w]} />
            ))}
          </div>,
        ])}
      />
    </Panel>
  )
}

export function WeeklyScores({
  story,
  highlighted,
}: {
  story: Story
  highlighted: string | null
}) {
  return (
    <Panel
      title="Weekly score vs the league"
      description={`Points each week of the ${story.year} regular season against that week's league median.`}
    >
      <HighlightLines
        data={story.weeklyScores}
        xKey="week"
        managers={story.managers}
        highlighted={highlighted}
        extra={{ key: "median", label: "League median" }}
      />
      <Legend
        items={[{ label: "League median", color: SERIES.orange }, ...highlightLegend(highlighted)]}
        note={PICK_HINT}
      />
    </Panel>
  )
}

const signed = (x: number) => `${x > 0 ? "+" : ""}${fmt(x, 1)}`

function HalvesCell({ halves }: { halves: Halves | null | undefined }) {
  if (!halves) return <span className="text-muted-foreground">—</span>
  if (halves.change == null) {
    return (
      <span className="text-muted-foreground" aria-label="Second half still to come">
        …
      </span>
    )
  }
  return <Detail details={`1st half ${fmt(halves.first!, 1)} → 2nd half ${fmt(halves.second!, 1)} PPG`}>{signed(halves.change)}</Detail>
}

// `year`: the season picked on the page, shown in bold (null for all-time)
export function StrongFinish({ data, year, highlighted }: { data: ReturnType<typeof strongFinish>; year: number | null; highlighted: string | null }) {
  return (
    <Panel
      title="Strong finish?"
      description="Change in regular-season PPG from the first half of each season to the second. Best average finisher first."
      method={`Each season splits at the middle of its regular season; double weeks are left out. Each cell is second-half PPG minus first-half PPG; tap or hover one to see both averages.${year != null ? ` ${year}, the season picked above, is in bold.` : ""} … is a second half still to come and — a season the manager wasn't in the league.`}
    >
      <SimpleTable
        head={["Manager", ...data.years.map(String), "Average"]}
        align={["left", ...data.years.map(() => "right" as const), "right"]}
        highlight={(i) => data.rows[i].manager === highlighted}
        rows={data.rows.map((r) => [
          r.manager,
          ...data.years.map((y) => (
            <span key={y} className={cn(y === year && "font-semibold")}>
              <HalvesCell halves={r.bySeason[y]} />
            </span>
          )),
          r.average == null ? <span key="avg" className="text-muted-foreground">—</span> : signed(r.average),
        ])}
      />
    </Panel>
  )
}

// Each award column sorts by its number (the score, margin or total) and shows who won it
const awardColumns = [
  ["Top score", "top"],
  ["Low score", "low"],
  ["Biggest win", "blowout"],
  ["Closest game", "closest"],
  ["Highest combined", "combined"],
  ["Lowest combined", "lowCombined"],
  ["Best score in a loss", "bestLoss"],
  ["Worst score in a win", "worstWin"],
] as const

const columnHelper = createColumnHelper<DataTableFeatures, WeekAwards>()

function AwardCell({ award, highlighted }: { award: Award; highlighted: string | null }) {
  return (
    <span className={cn("whitespace-nowrap rounded-[4px] px-1 py-0.5", award.who === highlighted && "bg-[color-mix(in_oklab,var(--highlight)_18%,transparent)]")}>
      <span className="font-medium">{award.who}</span> <span className="text-muted-foreground tabular-nums">{award.detail}</span>
    </span>
  )
}

// The highlighted manager's awards get a tint
const awardTableColumns = (highlighted: string | null) =>
  columnHelper.columns([
    columnHelper.accessor("week", { header: "Week", enableHiding: false, enableSorting: false }),
    ...awardColumns.map(([title, key]) =>
      columnHelper.accessor((row) => row[key].value, {
        id: title,
        header: ({ column }) => <SortableHeader column={column} title={title} />,
        sortFn: sortFn_numeric,
        sortDescFirst: true,
        cell: ({ row }) => <AwardCell award={row.original[key]} highlighted={highlighted} />,
      })
    ),
  ])

export function WeeklyAwards({ story, highlighted }: { story: Story; highlighted: string | null }) {
  const columns = React.useMemo(() => awardTableColumns(highlighted), [highlighted])
  return (
    <Panel
      title="Weekly awards"
      description="The record book's categories, week by week. Sort a column to find the season's best."
      method="Every week of the season counts, playoffs and consolation games included; double weeks are marked. Hide the categories you don't need with Columns."
    >
      <DataTable columns={columns} data={story.awards} />
    </Panel>
  )
}
