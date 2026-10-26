"use client"

import * as React from "react"
import {
    useTable,
    type ColumnDef,
    type ColumnFiltersState,
    type ColumnVisibilityState,
    type RowData,
    type SortingState
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { features, type DataTableFeatures } from "./data-table-features"

// Columns that stay pinned to the left while the table scrolls sideways. They
// need an opaque background, so match the row's stripe, hover and highlight
// colors (and the color transition) by hand.
const stickyColumnClasses: Record<string, string> = {
  player: "sticky left-0 z-10",
}
const stickyBackground =
  "bg-card transition-colors group-even:bg-[color-mix(in_oklab,var(--muted)_30%,var(--card))] group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))] group-data-highlighted:bg-[color-mix(in_oklab,var(--highlight)_14%,var(--card))]!"

function stickyClass(columnId: string) {
  const classes = stickyColumnClasses[columnId]
  return classes && `${classes} ${stickyBackground}`
}

const ariaSort = { asc: "ascending", desc: "descending" } as const

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  initialColumnVisibility?: ColumnVisibilityState
  initialSorting?: SortingState
  // Rows to pick out, e.g. the highlighted manager's
  highlight?: (row: TData) => boolean
  // Rows to play down, e.g. managers with too few games to compare
  muted?: (row: TData) => boolean
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  initialColumnVisibility = {},
  initialSorting = [],
  highlight,
  muted,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>(initialColumnVisibility)

  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  // The player filter holds the players that are unchecked (hidden). Tables without a player
  // column (one row per week, say) skip the rows menu.
  const playerColumn = table.getAllColumns().find((column) => column.id === "player")
  const hiddenPlayers = (playerColumn?.getFilterValue() as string[]) ?? []
  const players = React.useMemo(
    () =>
      playerColumn
        ? [
            ...new Set(
              table.getCoreRowModel().rows.map((row) => String(row.getValue("player")))
            ),
          ].sort((a, b) => a.localeCompare(b))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  )
  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide())
  const shownColumns = hideableColumns.filter((column) => column.getIsVisible()).length

  return (
    <div>
        {/* Same labels and sizes as the heatmaps' Rows and Columns menus */}
        <div className="flex flex-wrap items-center gap-2 pb-3">
        {playerColumn && (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                Rows
                {hiddenPlayers.length > 0 && (
                    <span className="text-muted-foreground tabular-nums">
                        {players.length - hiddenPlayers.length}/{players.length}
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80">
                {players.map((player) => (
                    <DropdownMenuCheckboxItem
                        key={player}
                        checked={!hiddenPlayers.includes(player)}
                        onCheckedChange={(value) =>
                        playerColumn?.setFilterValue(
                            value
                            ? hiddenPlayers.filter((hidden) => hidden !== player)
                            : [...hiddenPlayers, player]
                        )
                        }
                    >
                        {player}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
        )}
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                Columns
                {shownColumns < hideableColumns.length && (
                    <span className="text-muted-foreground tabular-nums">
                        {shownColumns}/{hideableColumns.length}
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80">
                {hideableColumns.map((column) => {
                    return (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                        }
                    >
                        {column.id}
                    </DropdownMenuCheckboxItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
        </div>
        <div className="overflow-hidden rounded-md border [&_[data-slot=table-container]]:scroll-shadow">
        <Table className="tabular-nums">
            <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="group">
                {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    return (
                    <TableHead
                        key={header.id}
                        aria-sort={sorted ? ariaSort[sorted] : undefined}
                        className={[stickyClass(header.column.id), header.column.columnDef.meta?.align === "right" && "text-right"].filter(Boolean).join(" ")}
                    >
                        {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                        )}
                    </TableHead>
                    )
                })}
                </TableRow>
            ))}
            </TableHeader>
            <TableBody>
            {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                <TableRow
                    key={row.id}
                    data-highlighted={highlight?.(row.original) || undefined}
                    data-muted={muted?.(row.original) || undefined}
                    className="group even:bg-muted/30 data-highlighted:bg-[color-mix(in_oklab,var(--highlight)_14%,var(--card))]! data-highlighted:font-medium data-highlighted:*:first:shadow-[inset_3px_0_0_var(--highlight)] data-muted:text-muted-foreground"
                >
                    {row.getVisibleCells().map((cell) => (
                    <TableCell
                        key={cell.id}
                        className={[stickyClass(cell.column.id), cell.column.columnDef.meta?.align === "right" && "text-right"].filter(Boolean).join(" ")}
                    >
                        <table.FlexRender cell={cell} />
                    </TableCell>
                    ))}
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>
    </div>
  )
}
