"use client"

import {
  constructSortFn,
  createColumnHelper,
  type CellData,
  type Column,
  type RowData,
} from "@tanstack/react-table"
import { type DataTableFeatures } from "./data-table-features"
import { ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"

// Every column in source.all_time after `player`, in table order.
const statColumns = [
  "GP", "Total", "Win%", "Div Total", "Div Win%",
  "Matt", "James", "Logan", "Robert", "Andy", "Max", "Andrew", "Landon",
  "Dillon", "Whieldon", "Ethan", "Brady", "Nick", "Cali",
  "East", "East %", "North", "North %", "South", "South %",
] as const

// Head-to-head columns, shown/hidden together by the table's quick toggle button.
export const headToHeadColumns = [
  "Matt", "James", "Logan", "Robert", "Andy", "Max", "Andrew", "Landon",
  "Dillon", "Whieldon", "Ethan", "Brady", "Nick", "Cali",
] as const

// Hide the head-to-head columns until toggled on via "Columns" or the quick toggle.
export const initialColumnVisibility: Partial<Record<keyof AllTime, boolean>> = {
    Matt: false,
    James: false,
    Logan: false,
    Robert: false,
    Andy: false,
    Max: false,
    Andrew: false,
    Landon: false,
    Dillon: false,
    Whieldon: false,
    Ethan: false,
    Brady: false,
    Nick: false,
    Cali: false,
}

// This type is used to define the shape of our data (one row of source.all_time).
export type AllTime = { player: string } & Record<
  (typeof statColumns)[number],
  string | number | null
>

// Percentages arrive as strings like "0.4444", which alphanumeric sorting
// would rank above "0.5", so compare them as numbers instead.
export const sortFn_numeric = constructSortFn({
  resolveDataValue: (value) => (value == null ? -Infinity : Number(value)),
  sort: (a, b) => (a === b ? 0 : a > b ? 1 : -1),
})

export function SortableHeader<TData extends RowData, TValue extends CellData>({
  column,
  title,
}: {
  column: Column<DataTableFeatures, TData, TValue>
  title: string
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

// Use `accessor` for data columns and `display` for columns without one.
const columnHelper = createColumnHelper<DataTableFeatures, AllTime>()

export const columns = columnHelper.columns([
  columnHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Player" />,
    enableHiding: false,
  }),
  ...statColumns.map((key) =>
    columnHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...(key.endsWith("%") && {
        sortFn: sortFn_numeric,
        cell: ({ getValue }) => {
          const value = getValue()
          return value == null ? null : Number(value).toFixed(3)
        },
      }),
    })
  ),
])
