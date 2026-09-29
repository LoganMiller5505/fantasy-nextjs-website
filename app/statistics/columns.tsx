"use client"

import {
  constructSortFn,
  createColumnHelper,
  type CellData,
  type Column,
} from "@tanstack/react-table"
import { type DataTableFeatures } from "./data-table-features"
import { ArrowUpDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

import { Button } from "@/components/ui/button"

// Every column in source.all_time after `player`, in table order.
const statColumns = [
  "Matt", "James", "Logan", "Robert", "Andy", "Max", "Andrew", "Landon",
  "Dillon", "Whieldon", "Ethan", "Brady", "Nick", "Cali",
  "GP", "Total", "Win%", "Div Total", "Div Win%",
  "East", "East %", "North", "North %", "South", "South %",
] as const

// Hide the head-to-head columns (Matt through GP) until toggled on via "Columns".
export const initialColumnVisibility = Object.fromEntries(
  statColumns
    .slice(0, statColumns.indexOf("GP") + 1)
    .map((key) => [key, false])
)

// This type is used to define the shape of our data (one row of source.all_time).
export type AllTime = { player: string } & Record<
  (typeof statColumns)[number],
  string | number | null
>

// Percentages arrive as strings like "0.4444", which alphanumeric sorting
// would rank above "0.5", so compare them as numbers instead.
const sortFn_numeric = constructSortFn({
  resolveDataValue: (value) => (value == null ? -Infinity : Number(value)),
  sort: (a, b) => (a === b ? 0 : a > b ? 1 : -1),
})

function SortableHeader<TValue extends CellData>({
  column,
  title,
}: {
  column: Column<DataTableFeatures, AllTime, TValue>
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
    columnHelper.display({
        id: "select",
        header: ({ table }) => (
        <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
            table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
        />
        ),
        cell: ({ row }) => (
        <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
        />
        ),
        enableSorting: false,
        enableHiding: false,
    }),
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
          return value == null ? null : `${(Number(value) * 100).toFixed(2)}%`
        },
      }),
    })
  ),
])
