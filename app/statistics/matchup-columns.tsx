"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { type DataTableFeatures } from "./data-table-features"
import { SortableHeader, sortFn_numeric } from "./columns"

// One row of a source.matchups_<year> table. Head-to-head cells are records like "1-0"
// (null if they haven't played). Win% is text in 2026 but a number in earlier years.
export type MatchupRow = { player: string } & Record<string, string | number | null>

const columnHelper = createColumnHelper<DataTableFeatures, MatchupRow>()

// `statColumns` is every column after `player`, in table order.
function matchupColumns(statColumns: string[]) {
  return columnHelper.columns([
    columnHelper.accessor("player", {
      header: ({ column }) => <SortableHeader column={column} title="Player" />,
      enableHiding: false,
    }),
    ...statColumns.map((key) =>
      columnHelper.accessor(key, {
        header: ({ column }) => <SortableHeader column={column} title={key} />,
        ...(key === "Win%" && {
          sortFn: sortFn_numeric,
          cell: ({ getValue }) => {
            const value = getValue()
            return value == null ? null : Number(value).toFixed(3)
          },
        }),
      })
    ),
  ])
}

export const matchupColumns2026 = matchupColumns([
  "Total", "Win%", "Div Total",
  "Matt", "James", "Logan", "Robert", "Andy", "Max", "Andrew", "Landon",
  "Dillon", "Whieldon", "Ethan", "Brady",
])

export const matchupColumns2025 = matchupColumns([
  "Total", "Win%", "Div Total",
  "Matt", "James", "Logan", "Robert", "Andy", "Max", "Nick", "Landon",
  "Dillon", "Whieldon", "Ethan", "Cali",
])

export const matchupColumns2024 = matchupColumns([
  "Total", "Win%",
  "Matt", "James", "Logan", "Robert", "Andy", "Max", "Nick",
  "Dillon", "Whieldon", "Ethan",
])
