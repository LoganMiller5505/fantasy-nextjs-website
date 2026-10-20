"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { cn } from "cn"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Validated categorical slots (dataviz reference palette), checked against this site's card
// surfaces in both modes. Red is only used as the warm pole of a diverging pair with blue.
export const SERIES = {
  blue: { light: "#2a78d6", dark: "#3987e5" },
  orange: { light: "#eb6834", dark: "#d95926" },
  aqua: { light: "#1baf7a", dark: "#199e70" },
  red: { light: "#e34948", dark: "#e66767" },
} as const

export const fmt = (x: number, places = 2) => x.toFixed(places)

export function Panel({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
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

export function Picker<T extends string | number>({
  value,
  options,
  onChange,
  label,
  format = String,
}: {
  value: T
  options: readonly T[]
  onChange: (value: T) => void
  label: string
  format?: (value: T) => string
}) {
  const items = options.map((o) => ({ value: o, label: format(o) }))
  return (
    <Select items={items} value={value} onValueChange={(v) => v != null && onChange(v as T)}>
      <SelectTrigger aria-label={label} className="min-w-28">
        <SelectValue />
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

export function Controls({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
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
    <div className="overflow-x-auto rounded-md border">
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
            <TableRow key={r} className={cn("even:bg-muted/30", highlight?.(r) && "bg-muted font-medium")}>
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
// twelve rows of numbers go unread. Clicking a grey line picks that manager.
export function HighlightLines({
  data,
  xKey,
  managers,
  highlighted,
  onPick,
  reversed = false,
  domain,
  ticks,
  unit = "",
  extra,
}: {
  data: Record<string, string | number>[]
  xKey: string
  managers: string[]
  highlighted: string
  onPick?: (manager: string) => void
  reversed?: boolean
  domain?: [number, number]
  ticks?: number[]
  unit?: string
  // An additional named series drawn in orange (e.g. the league median)
  extra?: { key: string; label: string }
}) {
  const [hovered, setHovered] = React.useState<string | null>(null)
  const config = {
    [highlighted]: { label: highlighted, theme: SERIES.blue },
    ...(extra && { [extra.key]: { label: extra.label, theme: SERIES.orange } }),
  } satisfies ChartConfig
  // The hovered line is drawn last so it sits above the other grey ones
  const others = managers
    .filter((m) => m !== highlighted)
    .sort((a, b) => Number(a === hovered) - Number(b === hovered))
  const shown = new Set([highlighted, hovered, extra?.key])

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          reversed={reversed}
          domain={domain ?? ["auto", "auto"]}
          ticks={ticks}
          interval={ticks ? 0 : "preserveEnd"}
          allowDecimals={false}
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
                    {value}
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
            strokeOpacity={m === hovered ? 1 : 0.3}
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
            style={{ cursor: onPick ? "pointer" : undefined }}
            onMouseEnter={() => setHovered(m)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              setHovered(null)
              onPick?.(m)
            }}
          />
        ))}
        {extra && (
          <Line dataKey={extra.key} type="linear" stroke={`var(--color-${extra.key})`} strokeWidth={2} dot={false} />
        )}
        <Line
          dataKey={highlighted}
          type="linear"
          stroke={`var(--color-${highlighted})`}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  )
}

export const PICK_HINT = "Hover a grey line to see who it is; click it to switch."

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
      {note && <span className="text-muted-foreground/80">{note}</span>}
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

export function HeatTable({
  corner = "",
  columns,
  rows,
  highlight,
}: {
  corner?: string
  columns: React.ReactNode[]
  rows: { key: string; label: React.ReactNode; cells: HeatValue[] }[]
  highlight?: (key: string) => boolean
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-separate border-spacing-0.5 p-1 text-xs tabular-nums">
        <thead>
          <tr>
            <th className="text-muted-foreground px-2 py-1 text-left font-medium">{corner}</th>
            {columns.map((c, i) => (
              <th key={i} className="text-muted-foreground px-1 py-1 text-center font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th
                scope="row"
                className={cn(
                  "px-2 py-1 text-left font-normal whitespace-nowrap",
                  highlight?.(row.key) && "bg-muted rounded-[4px] font-semibold"
                )}
              >
                {row.label}
              </th>
              {row.cells.map((cell, i) => {
                const Tag = cell.onClick ? "button" : "div"
                return (
                  <td key={i} className="p-0">
                    <Tag
                      type={cell.onClick ? "button" : undefined}
                      title={cell.title}
                      onClick={cell.onClick}
                      className={cn(
                        "flex h-7 w-full min-w-11 items-center justify-center rounded-[4px] px-1.5",
                        TONES[cell.tone ?? "blue"],
                        cell.t == null ? "text-muted-foreground bg-muted/40" : cell.t > 0.55 && "text-white",
                        cell.outlined && "ring-foreground/60 ring-1 ring-inset",
                        cell.onClick && "focus-visible:ring-ring cursor-pointer hover:ring-2 hover:ring-foreground/40 focus-visible:ring-2 focus-visible:outline-none"
                      )}
                      style={
                        cell.t == null
                          ? undefined
                          : { backgroundColor: `color-mix(in oklab, var(--heat) ${Math.round(6 + cell.t * 84)}%, var(--card))` }
                      }
                    >
                      {cell.text}
                    </Tag>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// A diverging cell value: positive leans blue, negative red, with `limit` as full strength
export const diverging = (x: number, limit: number): Pick<HeatValue, "t" | "tone"> => ({
  t: Math.min(Math.abs(x) / (limit || 1), 1),
  tone: x >= 0 ? "blue" : "red",
})
