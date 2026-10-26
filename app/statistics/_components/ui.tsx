"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChevronDown } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Validated categorical slots (dataviz reference palette), checked against this site's card
// surfaces in both modes. Red is only used as the warm pole of a diverging pair with blue.
export const SERIES = {
  blue: { light: "#2a78d6", dark: "#3987e5" },
  orange: { light: "#eb6834", dark: "#d95926" },
  aqua: { light: "#1baf7a", dark: "#199e70" },
  red: { light: "#e34948", dark: "#e66767" },
} as const

export const fmt = (x: number, places = 2) => x.toFixed(places)
// Win percentages the baseball way: .538, 1.000
export const pctFmt = (x: number) => x.toFixed(3).replace(/^0/, "")

// The highlighted manager's row: a light tint of the chart blue and a blue left edge, so "my row"
// matches "my line" and doesn't read as a zebra stripe
export const HIGHLIGHT_ROW =
  "bg-[color-mix(in_oklab,var(--highlight)_14%,var(--card))]! font-medium *:first:shadow-[inset_3px_0_0_var(--highlight)]"

// Panels inside a Section title themselves one level below the section's heading
const HeadingLevel = React.createContext<2 | 3>(2)

// A group of panels under a heading, so long pages have landmarks to scan and jump between
export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="grid gap-0.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      <HeadingLevel.Provider value={3}>{children}</HeadingLevel.Provider>
    </section>
  )
}

// A card for one chart or table. The description says in a sentence what it shows; `method`
// holds how it's worked out, behind a disclosure. `controls` are the choices that only affect
// this panel; they sit in a row at the top of its content, like the view options of tables and
// heatmaps.
export function Panel({
  id,
  title,
  description,
  method,
  action,
  controls,
  className,
  children,
}: {
  id?: string
  title: string
  description?: React.ReactNode
  method?: React.ReactNode
  action?: React.ReactNode
  controls?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const Heading = React.useContext(HeadingLevel) === 3 ? "h3" : "h2"
  return (
    <Card id={id} className={cn("min-w-0 scroll-mt-32", className)}>
      <CardHeader>
        <CardTitle>
          <Heading>{title}</Heading>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {method && (
          <Collapsible className="text-muted-foreground text-xs">
            <CollapsibleTrigger className="group/method hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
              How it&apos;s calculated
              <ChevronDown className="size-3.5 transition-transform group-data-panel-open/method:rotate-180" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="max-w-prose pt-1 leading-relaxed">{method}</CollapsibleContent>
          </Collapsible>
        )}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        {controls && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
        <div className="min-w-0">{children}</div>
      </CardContent>
    </Card>
  )
}

export function StatTile({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardHeader>
      <CardContent className="text-muted-foreground text-xs">{detail}</CardContent>
    </Card>
  )
}

// Stat tiles two to a row on phones, so a set of them doesn't push everything else far down
export function TileGrid({ wide = 4, children }: { wide?: 3 | 4; children: React.ReactNode }) {
  return <div className={cn("grid grid-cols-2 gap-3", wide === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>{children}</div>
}

// A Select over a short list. A null value shows the placeholder.
export function Picker<T extends string | number>({
  value,
  options,
  onChange,
  label,
  format = String,
  placeholder,
  size = "default",
}: {
  value: T | null
  options: readonly T[]
  onChange: (value: T) => void
  label: string
  format?: (value: T) => string
  placeholder?: string
  size?: "sm" | "default"
}) {
  const items = options.map((o) => ({ value: o, label: format(o) }))
  return (
    <Select items={items} value={value} onValueChange={(v) => v != null && onChange(v as T)}>
      <SelectTrigger aria-label={label} size={size} className="min-w-28">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={String(item.value)} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// A value with details that open on hover, focus or tap, for numbers that need a second look
export function Detail({ details, children }: { details: React.ReactNode; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        render={
          <button
            type="button"
            className="focus-visible:ring-ring cursor-pointer rounded-sm underline decoration-dotted underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
          />
        }
      >
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-64 text-xs">
        {details}
      </PopoverContent>
    </Popover>
  )
}

// A plain table for small, fixed lists. Bigger sortable ones use the statistics DataTable.
export function SimpleTable({
  head,
  rows,
  align,
  highlight,
}: {
  head: string[]
  rows: React.ReactNode[][]
  align?: ("left" | "right")[]
  highlight?: (index: number) => boolean
}) {
  return (
    <div className="overflow-hidden rounded-md border [&_[data-slot=table-container]]:scroll-shadow">
      <Table className="tabular-nums">
        <TableHeader>
          <TableRow>
            {head.map((h, i) => (
              <TableHead key={i} className={align?.[i] === "right" ? "text-right" : undefined}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, r) => (
            <TableRow key={r} className={cn("even:bg-muted/30", highlight?.(r) && HIGHLIGHT_ROW)}>
              {cells.map((cell, i) => (
                <TableCell key={i} className={align?.[i] === "right" ? "text-right" : undefined}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// One line per manager: the picked one in blue on top, everyone else as thin grey context.
// The tooltip reports the picked manager, plus whichever grey line the pointer is on, since
// twelve rows of numbers go unread. Pointing at or tapping a grey line shows whose it is; only
// the Highlight picker changes who's highlighted, so a stray tap can't.
export function HighlightLines({
  data,
  xKey,
  managers,
  highlighted,
  reversed = false,
  domain,
  ticks,
  unit = "",
  format,
  extra,
}: {
  data: Record<string, string | number>[]
  xKey: string
  managers: string[]
  highlighted: string | null // null: every line in grey, none picked out
  reversed?: boolean
  domain?: [number, number]
  ticks?: number[]
  unit?: string
  // Formats axis ticks and tooltip values; set it for fractional values like win %
  format?: (value: number) => string
  // An additional named series drawn in orange (e.g. the league median)
  extra?: { key: string; label: string }
}) {
  const [hovered, setHovered] = React.useState<string | null>(null)
  const config = {
    ...(highlighted != null && { [highlighted]: { label: highlighted, theme: SERIES.blue } }),
    ...(extra && { [extra.key]: { label: extra.label, theme: SERIES.orange } }),
  } satisfies ChartConfig
  // The hovered line is drawn last so it sits above the other grey ones
  const others = managers
    .filter((m) => m !== highlighted)
    .sort((a, b) => Number(a === hovered) - Number(b === hovered))
  const shown = new Set([highlighted, hovered, extra?.key])

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      {/* Formatted ticks like "1.000" are wider, so they get the full left margin */}
      <LineChart data={data} margin={{ top: 8, right: 12, left: format ? 0 : -12, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          reversed={reversed}
          domain={domain ?? ["auto", "auto"]}
          ticks={ticks}
          interval={ticks ? 0 : "preserveEnd"}
          allowDecimals={format != null}
          tickFormatter={format}
          width={48}
        />
        <ChartTooltip
          content={({ active, label, payload }) => (
            <ChartTooltipContent
              active={active}
              label={label}
              payload={payload?.filter((p) => shown.has(p.dataKey as string))}
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as string]?.label ?? name}</span>
                  <span className="font-medium tabular-nums">
                    {format ? format(Number(value)) : value}
                    {unit}
                  </span>
                </div>
              )}
            />
          )}
        />
        {others.map((m) => (
          <Line
            key={m}
            dataKey={m}
            type="linear"
            stroke="var(--muted-foreground)"
            // With nobody picked out the grey lines are the whole chart, so they're drawn stronger
            strokeOpacity={m === hovered ? 1 : highlighted == null ? 0.55 : 0.3}
            strokeWidth={m === hovered ? 2 : 1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        ))}
        {/* Invisible wide strokes over the grey lines, so a 1px line is easy to point at */}
        {others.map((m) => (
          <Line
            key={`hit-${m}`}
            dataKey={m}
            type="linear"
            stroke="var(--foreground)"
            strokeOpacity={0}
            strokeWidth={14}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
            onMouseEnter={() => setHovered(m)}
            onMouseLeave={() => setHovered(null)}
            // Touch has no hover: a tap shows the line, a second tap hides it
            onClick={() => setHovered((h) => (h === m ? null : m))}
          />
        ))}
        {extra && (
          <Line dataKey={extra.key} type="linear" stroke={`var(--color-${extra.key})`} strokeWidth={2} dot={false} />
        )}
        {highlighted != null && (
          <Line
            dataKey={highlighted}
            type="linear"
            stroke={`var(--color-${highlighted})`}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
      </LineChart>
    </ChartContainer>
  )
}

export const PICK_HINT = "Tap or hover a grey line to see who it is."

// Legend entries for a HighlightLines chart: the highlighted manager in blue (if any), then the rest
export const highlightLegend = (highlighted: string | null) => [
  ...(highlighted != null ? [{ label: highlighted, color: SERIES.blue }] : []),
  { label: highlighted != null ? "Rest of the league" : "Every manager", color: "muted" as const },
]

export function Legend({
  items,
  note,
}: {
  items: { label: string; color: { light: string; dark: string } | "muted" }[]
  note?: string
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {items.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-[2px] bg-(--swatch) dark:bg-(--swatch-dark)"
            style={
              color === "muted"
                ? ({ "--swatch": "var(--muted-foreground)", "--swatch-dark": "var(--muted-foreground)", opacity: 0.4 } as React.CSSProperties)
                : ({ "--swatch": color.light, "--swatch-dark": color.dark } as React.CSSProperties)
            }
          />
          {label}
        </span>
      ))}
      {note && <span>{note}</span>}
    </div>
  )
}

// Heat tables tint each cell by a value t in [0, 1]: 0 is the card surface, 1 the full series colour.
// Blue alone is sequential; blue and red together are the two arms of a diverging scale.
const TONES = {
  blue: "[--heat:#2a78d6] dark:[--heat:#3987e5]",
  red: "[--heat:#e34948] dark:[--heat:#e66767]",
} as const

export type HeatValue = {
  text: React.ReactNode
  t: number | null // null: no colour (a diagonal, a bye, no games)
  tone?: keyof typeof TONES
  title?: string
  onClick?: () => void
  outlined?: boolean
}

// Show or hide each of a list of items, with "Show all" on top
function VisibilityMenu({
  label,
  items,
  hidden,
  onChange,
}: {
  label: string
  items: { key: string; label: React.ReactNode }[]
  hidden: Set<string>
  onChange: (hidden: Set<string>) => void
}) {
  const shown = items.filter((i) => !hidden.has(i.key)).length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        {label}
        {shown < items.length && <span className="text-muted-foreground tabular-nums">{shown}/{items.length}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80">
        <DropdownMenuItem closeOnClick={false} disabled={!hidden.size} onClick={() => onChange(new Set())}>
          Show all
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.key}
            checked={!hidden.has(item.key)}
            onCheckedChange={(checked) => {
              const next = new Set(hidden)
              if (checked) next.delete(item.key)
              else next.add(item.key)
              onChange(next)
            }}
          >
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

// One heat cell. Each has an accessible name (its details); those details show in a tooltip when
// the cell does something on click (opens a rivalry), and in a popover that also opens on tap
// otherwise. Only the focused cell of the grid is in the Tab order.
function HeatCell({
  cell,
  position,
  focused,
  colors,
  onFocus,
}: {
  cell: HeatValue
  position: string
  focused: boolean
  colors: boolean
  onFocus: () => void
}) {
  const tinted = colors && cell.t != null
  const empty = cell.text === "" || cell.text == null
  const props = {
    "data-cell": position,
    tabIndex: focused ? 0 : -1,
    "aria-label": cell.title ?? (empty ? "No value" : String(cell.text)),
    onFocus,
    className: cn(
      "flex h-7 w-full min-w-11 items-center justify-center rounded-[4px] px-1.5 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
      TONES[cell.tone ?? "blue"],
      !tinted && "bg-muted/40",
      (cell.t == null || empty) && "text-muted-foreground",
      cell.outlined && "ring-foreground/60 ring-1 ring-inset",
      (cell.onClick || cell.title) && "cursor-pointer hover:ring-2 hover:ring-foreground/40"
    ),
    style: tinted
      ? { backgroundColor: `color-mix(in oklab, var(--heat) ${Math.round(6 + cell.t! * 84)}%, var(--card))` }
      : undefined,
  }
  const text = empty ? "—" : cell.text

  if (cell.onClick) {
    return (
      <Tooltip>
        <TooltipTrigger render={<button type="button" onClick={cell.onClick} {...props} />}>{text}</TooltipTrigger>
        {cell.title && <TooltipContent>{cell.title}</TooltipContent>}
      </Tooltip>
    )
  }
  if (cell.title) {
    return (
      <Popover>
        <PopoverTrigger openOnHover delay={150} render={<button type="button" {...props} />}>
          {text}
        </PopoverTrigger>
        <PopoverContent side="top" className="w-auto max-w-64 text-xs">
          {cell.title}
        </PopoverContent>
      </Popover>
    )
  }
  return <div {...props}>{text}</div>
}

// A grid of tinted cells with its own toolbar: pick which rows and columns to show, and turn
// the colours off to read it as a plain table. The whole grid is one Tab stop; the arrow keys
// (and Home/End along a row) move between cells.
export function HeatTable({
  corner = "",
  columns,
  rows,
  highlight,
}: {
  corner?: string
  columns: string[]
  rows: { key: string; label: React.ReactNode; cells: HeatValue[] }[]
  highlight?: (key: string) => boolean
}) {
  const [hiddenRows, setHiddenRows] = React.useState<Set<string>>(new Set())
  const [hiddenColumns, setHiddenColumns] = React.useState<Set<string>>(new Set())
  const [colors, setColors] = React.useState(true)
  const [focus, setFocus] = React.useState<[number, number]>([0, 0])
  const grid = React.useRef<HTMLTableSectionElement>(null)
  const colorsId = React.useId()
  const shownColumns = columns.flatMap((c, i) => (hiddenColumns.has(c) ? [] : [i]))
  const shownRows = rows.filter((row) => !hiddenRows.has(row.key))
  // Hiding rows or columns can leave the focused cell outside the grid
  const fr = Math.min(focus[0], shownRows.length - 1)
  const fc = Math.min(focus[1], shownColumns.length - 1)

  const move = (event: React.KeyboardEvent) => {
    const step = ARROWS[event.key]
    let next: [number, number] | null = null
    if (step) next = [fr + step[0], fc + step[1]]
    else if (event.key === "Home") next = [fr, 0]
    else if (event.key === "End") next = [fr, shownColumns.length - 1]
    if (!next) return
    event.preventDefault()
    const [r, c] = [
      Math.max(0, Math.min(next[0], shownRows.length - 1)),
      Math.max(0, Math.min(next[1], shownColumns.length - 1)),
    ]
    setFocus([r, c])
    grid.current?.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`)?.focus()
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <VisibilityMenu
          label="Rows"
          items={rows.map((r) => ({ key: r.key, label: r.key }))}
          hidden={hiddenRows}
          onChange={setHiddenRows}
        />
        <VisibilityMenu
          label="Columns"
          items={columns.map((c) => ({ key: c, label: c }))}
          hidden={hiddenColumns}
          onChange={setHiddenColumns}
        />
        <label htmlFor={colorsId} className="ml-auto flex items-center gap-2 text-sm">
          <Switch id={colorsId} checked={colors} onCheckedChange={setColors} />
          Colors
        </label>
      </div>
      <TooltipProvider delay={150}>
        <div className="scroll-shadow overflow-x-auto rounded-md border">
          <table className="w-full border-separate border-spacing-0.5 p-1 text-xs tabular-nums">
            <caption className="sr-only">Use the arrow keys to move between cells.</caption>
            <thead>
              <tr>
                <th className="text-muted-foreground px-2 py-1 text-left font-medium">{corner}</th>
                {shownColumns.map((i) => (
                  <th key={columns[i]} scope="col" className="text-muted-foreground px-1 py-1 text-center font-medium whitespace-nowrap">
                    {columns[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={grid} onKeyDown={move}>
              {shownRows.map((row, r) => (
                <tr key={row.key}>
                  <th
                    scope="row"
                    className={cn(
                      "rounded-[4px] px-2 py-1 text-left font-normal whitespace-nowrap",
                      highlight?.(row.key) && "bg-[color-mix(in_oklab,var(--highlight)_14%,var(--card))] font-semibold shadow-[inset_3px_0_0_var(--highlight)]"
                    )}
                  >
                    {row.label}
                  </th>
                  {shownColumns.map((i, c) => (
                    <td key={columns[i]} className="p-0">
                      <HeatCell
                        cell={row.cells[i]}
                        position={`${r}-${c}`}
                        focused={r === fr && c === fc}
                        colors={colors}
                        onFocus={() => setFocus([r, c])}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TooltipProvider>
    </div>
  )
}

// A diverging cell value: positive leans blue, negative red, with `limit` as full strength
export const diverging = (x: number, limit: number): Pick<HeatValue, "t" | "tone"> => ({
  t: Math.min(Math.abs(x) / (limit || 1), 1),
  tone: x >= 0 ? "blue" : "red",
})
