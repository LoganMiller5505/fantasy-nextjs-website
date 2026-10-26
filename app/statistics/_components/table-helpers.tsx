"use client"

import { constructSortFn, type CellData, type Column, type RowData } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type DataTableFeatures } from "./data-table-features"

// Numbers can arrive as strings like "0.4444", which alphanumeric sorting would rank above
// "0.5", so compare them as numbers instead.
export const sortFn_numeric = constructSortFn({
  resolveDataValue: (value) => (value == null ? -Infinity : Number(value)),
  sort: (a, b) => (a === b ? 0 : a > b ? 1 : -1),
})

// Records like "9-5" sort by win %, then by wins; empty cells sort last
export const sortFn_record = constructSortFn({
  resolveDataValue: (value) => {
    if (value == null) return -Infinity
    const [w, l] = String(value).split("-").map(Number)
    return w + l ? w / (w + l) + w / 1e6 : 0
  },
  sort: (a, b) => (a === b ? 0 : a > b ? 1 : -1),
})

// Spread into a numeric column's definition: sorts as a number, biggest first on the first click,
// and right-aligned
export const numeric = {
  sortFn: sortFn_numeric,
  sortDescFirst: true,
  meta: { align: "right" as const },
}

export function SortableHeader<TData extends RowData, TValue extends CellData>({
  column,
  title,
}: {
  column: Column<DataTableFeatures, TData, TValue>
  title: string
}) {
  const sorted = column.getIsSorted()
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
  return (
    // No argument: the column picks the next direction itself, honouring sortDescFirst
    <Button variant="ghost" onClick={() => column.toggleSorting()}>
      {title}
      <Icon className={sorted ? "h-4 w-4" : "text-muted-foreground h-4 w-4"} />
    </Button>
  )
}

// Number formats shared by the tables: always the same number of decimal places
export const points = (x: number) =>
  x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
