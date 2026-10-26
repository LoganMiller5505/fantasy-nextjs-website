"use client"

import * as React from "react"
import { createColumnHelper } from "@tanstack/react-table"
import { cn } from "cn"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { SortableHeader, sortFn_numeric } from "../_components/table-helpers"
import type { Award, Halves, SeasonStory as Story, WeekAwards, WeekResult, divisions as divisionsOf, strongFinish } from "../_lib/stats"
import { Segmented } from "../_components/scope"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Detail, HIGHLIGHT_ROW, HighlightLines, Legend, ManagerLink, PICK_HINT, highlightLegend, Panel, SERIES, SimpleTable, fmt } from "../_components/ui"

type Divisions = ReturnType<typeof divisionsOf>

// One week of the form strip. Weeks still to play aren't drawn at all.
function Chip({ result, label }: { result: Exclude<WeekResult, null>; label: string }) {
  const said = result === "bye" ? "no game" : result === "W" ? "win" : "loss"
  return (
    <span
      title={`${label}: ${said}`}
      aria-label={`${label}: ${said}`}
      role="img"
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-[4px] text-[10px] font-semibold",
        result === "W" && "bg-foreground text-background",
        result === "L" && "bg-muted text-muted-foreground",
        result === "bye" && "text-muted-foreground/60"
      )}
    >
      {result === "bye" ? "–" : result}
    </span>
  )
}

type View = "Overall" | "By division"

// The season's table: overall with each manager's division, or split into the divisions, ranked
// within each. PA gives way on phones so the form strip fits.
export function Standings({ story, divisions, highlighted }: { story: Story; divisions: Divisions; highlighted: string | null }) {
  const [view, setView] = React.useState<View>("Overall")
  const division = new Map(divisions?.tables.flatMap((t) => t.rows.map((r) => [r.manager, { name: t.division, record: r.divRecord }])) ?? [])
  const byDivision = divisions != null && view === "By division"
  const groups = byDivision
    ? divisions.tables.map((t) => ({ title: t.division, rows: story.standings.filter((r) => division.get(r.manager)?.name === t.division) }))
    : [{ title: null, rows: story.standings }]
  const right = "text-right"
  const phoneHidden = "max-sm:hidden"

  return (
    <Panel
      title={`${story.year} standings`}
      description="Regular-season record and points, then every week played so far as a win or loss."
      method={`W-L, PF and PA are regular season only.${divisions ? " Div is the record against the manager's own division." : ""} The weeks run through the playoffs, consolation games included; – is a bye.`}
      controls={divisions && <Segmented label="Standings view" size="sm" value={view} options={["Overall", "By division"] as const} onChange={setView} />}
    >
      <div className="overflow-hidden rounded-md border [&_[data-slot=table-container]]:scroll-shadow">
        <Table className="tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Manager</TableHead>
              {divisions && !byDivision && <TableHead>Division</TableHead>}
              <TableHead className={right}>W-L</TableHead>
              {divisions && <TableHead className={right}>Div</TableHead>}
              <TableHead className={right}>PF</TableHead>
              <TableHead className={cn(right, phoneHidden)}>PA</TableHead>
              <TableHead>Weeks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <React.Fragment key={group.title ?? "all"}>
                {group.title && (
                  <TableRow className="hover:bg-transparent">
                    <TableHead colSpan={8} scope="colgroup" className="bg-muted/50 text-foreground h-8 font-semibold">
                      {group.title}
                    </TableHead>
                  </TableRow>
                )}
                {group.rows.map((row, i) => (
                  <TableRow key={row.manager} className={cn("even:bg-muted/30", row.manager === highlighted && HIGHLIGHT_ROW)}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <ManagerLink manager={row.manager} />
                    </TableCell>
                    {divisions && !byDivision && <TableCell className="text-muted-foreground">{division.get(row.manager)?.name}</TableCell>}
                    <TableCell className={right}>{`${row.wins}-${row.losses}`}</TableCell>
                    {divisions && <TableCell className={right}>{division.get(row.manager)?.record}</TableCell>}
                    <TableCell className={right}>{fmt(row.pf)}</TableCell>
                    <TableCell className={cn(right, phoneHidden)}>{fmt(row.pa)}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {row.results.map((r, w) =>
                          r == null ? null : <Chip key={w} result={r} label={story.weekLabels[w]} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
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
        endLabels={false}
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
      method="Every week of the season counts, playoffs and consolation games included; double weeks are marked. Highest and lowest combined, best score in a loss and worst score in a win start hidden; add them with Columns."
    >
      <DataTable
        columns={columns}
        data={story.awards}
        // The other four start hidden so the table fits without scrolling sideways
        initialColumnVisibility={{ "Highest combined": false, "Lowest combined": false, "Best score in a loss": false, "Worst score in a win": false }}
        phoneHidden={["Low score", "Closest game"]}
      />
    </Panel>
  )
}
