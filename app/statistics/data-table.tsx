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

import { EyeIcon, EyeOffIcon } from "lucide-react"
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
// need an opaque background, so match the row's hover color (and its color
// transition) by hand.
const stickyColumnClasses: Record<string, string> = {
  player: "sticky left-0 z-10",
}
const stickyBackground =
  "bg-background transition-colors group-even:bg-[color-mix(in_oklab,var(--muted)_30%,var(--background))] group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]"

function stickyClass(columnId: string) {
  const classes = stickyColumnClasses[columnId]
  return classes && `${classes} ${stickyBackground}`
}

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  initialColumnVisibility?: ColumnVisibilityState
  initialSorting?: SortingState
  // Optional button that shows/hides a group of columns at once
  quickToggle?: { label: string; columns: readonly string[] }
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  initialColumnVisibility = {},
  initialSorting = [],
  quickToggle,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>(initialColumnVisibility)

  // Shows the whole group if any of it is hidden, otherwise hides it
  const quickToggleShown =
    quickToggle?.columns.every((id) => columnVisibility[id] !== false) ?? false
  const toggleQuickColumns = () =>
    setColumnVisibility((prev) => ({
      ...prev,
      ...Object.fromEntries(quickToggle!.columns.map((id) => [id, !quickToggleShown])),
    }))
  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 15 },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  // The player filter holds the players that are unchecked (hidden)
  const playerColumn = table.getColumn("player")
  const hiddenPlayers = (playerColumn?.getFilterValue() as string[]) ?? []
  const players = React.useMemo(
    () =>
      [
        ...new Set(
          table.getCoreRowModel().rows.map((row) => String(row.getValue("player")))
        ),
      ].sort((a, b) => a.localeCompare(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  )

  return (
    <div>
        <div className="grid grid-cols-2 gap-2 py-4 sm:flex sm:items-center">
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
                Player Toggle
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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
        <div className="contents sm:ml-auto sm:flex sm:gap-2">
        {quickToggle && (
            <Button variant="outline" className="order-last col-span-2 sm:order-none" onClick={toggleQuickColumns}>
                {quickToggleShown ? <EyeOffIcon /> : <EyeIcon />}
                {quickToggleShown ? "Hide" : "Show"} {quickToggle.label}
            </Button>
        )}
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
                Column Toggle
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {table
                .getAllColumns()
                .filter(
                    (column) => column.getCanHide()
                )
                .map((column) => {
                    return (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
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
        </div>
        <div className="overflow-hidden rounded-md border">
        <Table>
            <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="group">
                {headerGroup.headers.map((header) => {
                    return (
                    <TableHead key={header.id} className={stickyClass(header.column.id)}>
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
                    className="group even:bg-muted/30"
                >
                    {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={stickyClass(cell.column.id)}>
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
        {/* Pagination 
        <div className="flex items-center justify-end space-x-2 py-4">
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            >
            Previous
            </Button>
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            >
            Next
            </Button>
      </div>
      */}
    </div>
  )
}