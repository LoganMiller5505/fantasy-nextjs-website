"use client"

import * as React from "react"
import { Trophy } from "lucide-react"
import { createColumnHelper } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { ScopeToggle } from "../_components/scope"
import { SortableHeader, numeric, sortFn_record } from "../_components/table-helpers"
import { HighlightLines, Legend, ManagerLink, PICK_HINT, Panel, highlightLegend, pctFmt } from "../_components/ui"
import type { Scope, careers, winPctByWeek } from "../_lib/stats"

type Careers = ReturnType<typeof careers>
// DataTable's Rows menu and sticky column look for a "player" column
type CareerRow = Careers["rows"][number] & { player: string }

const columnHelper = createColumnHelper<DataTableFeatures, CareerRow>()
const record = { sortFn: sortFn_record, sortDescFirst: true, meta: { align: "right" as const } }

const careerColumns = (years: number[]) =>
  columnHelper.columns([
    columnHelper.accessor("player", {
      header: ({ column }) => <SortableHeader column={column} title="Manager" />,
      enableHiding: false,
      filterFn: "excludes",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          <ManagerLink manager={row.original.player} />
          {!row.original.active && <Badge variant="outline">Former</Badge>}
        </span>
      ),
    }),
    // Sorts by how many seasons; shows the span
    columnHelper.accessor("seasons", {
      id: "Seasons",
      header: ({ column }) => <SortableHeader column={column} title="Seasons" />,
      ...numeric,
      meta: {},
      cell: ({ row }) => row.original.span,
    }),
    ...years.map((y) =>
      columnHelper.accessor((r) => r.bySeason[y], {
        id: String(y),
        header: ({ column }) => <SortableHeader column={column} title={String(y)} />,
        ...record,
        cell: ({ getValue }) => getValue() ?? <span className="text-muted-foreground">—</span>,
      })
    ),
    columnHelper.accessor("career", {
      id: "Career",
      header: ({ column }) => <SortableHeader column={column} title="Career" />,
      ...record,
    }),
    columnHelper.accessor("pct", {
      id: "Win %",
      header: ({ column }) => <SortableHeader column={column} title="Win %" />,
      ...numeric,
      cell: ({ getValue }) => pctFmt(getValue()),
    }),
    columnHelper.accessor("playoffs", {
      id: "Playoffs",
      header: ({ column }) => <SortableHeader column={column} title="Playoffs" />,
      ...numeric,
    }),
    columnHelper.accessor("titles", {
      id: "Titles",
      header: ({ column }) => <SortableHeader column={column} title="Titles" />,
      ...numeric,
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="inline-flex items-center gap-1">
            <Trophy className="size-3.5" aria-hidden />
            {getValue()}
          </span>
        ) : 0,
    }),
  ])

// The career table, then win % as it moved week by week
export function CareersView({
  data,
  scopes,
  byWeek,
  highlighted,
}: {
  data: Careers
  scopes: Scope[]
  byWeek: Record<string, ReturnType<typeof winPctByWeek>>
  highlighted: string | null
}) {
  const [scope, setScope] = React.useState<Scope>("all")
  const overTime = byWeek[String(scope)]
  // A season can be missing the highlighted manager; their line comes back with the season
  const shown = highlighted != null && overTime.managers.includes(highlighted) ? highlighted : null
  const columns = React.useMemo(() => careerColumns(data.years), [data.years])
  const rows = React.useMemo(() => data.rows.map((r) => ({ ...r, player: r.manager })), [data.rows])

  return (
    <div className="grid gap-4">
      <Panel title="Every career" description="Each manager's record season by season, with playoff trips and titles.">
        <DataTable columns={columns} data={rows} highlight={(r) => r.player === highlighted} />
      </Panel>
      <Panel
        title="Win % over time"
        description={scope === "all" ? "Career win % after every week." : `Win % after each week of ${scope}.`}
        method="Every game counts, playoffs and consolation games included. A line starts once a manager has played 4 games, so it doesn't open on a meaningless 1.000 or .000, and breaks for seasons they weren't in the league."
        controls={<ScopeToggle value={scope} options={scopes} onChange={setScope} />}
      >
        <HighlightLines
          data={overTime.data}
          xKey="week"
          managers={overTime.managers}
          highlighted={shown}
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          format={pctFmt}
        />
        <Legend items={highlightLegend(shown)} note={PICK_HINT} />
      </Panel>
    </div>
  )
}
