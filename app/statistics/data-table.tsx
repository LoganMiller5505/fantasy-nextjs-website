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
import { Input } from "@/components/ui/input"

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
// need an opaque background, so match the row's hover/selected colors (and its
// color transition) by hand.
const stickyColumnClasses: Record<string, string> = {
  select: "sticky left-0 z-10 w-8 min-w-8 max-w-8",
  player: "sticky left-8 z-10",
}
const stickyBackground =
  "bg-background transition-colors group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] group-data-[state=selected]:bg-muted"

function stickyClass(columnId: string) {
  const classes = stickyColumnClasses[columnId]
  return classes && `${classes} ${stickyBackground}`
}

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  initialColumnVisibility?: ColumnVisibilityState
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  initialColumnVisibility = {},
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>(initialColumnVisibility)
  const [rowSelection, setRowSelection] = React.useState({})
  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 15 },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div>
        <div className="flex items-center py-4">
        <Input
          placeholder="Filter players..."
          value={(table.getColumn("player")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("player")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="ml-auto" />}>
                Columns
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
                    data-state={row.getIsSelected() && "selected"}
                    className="group"
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
        <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
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
    </div>
  )
}