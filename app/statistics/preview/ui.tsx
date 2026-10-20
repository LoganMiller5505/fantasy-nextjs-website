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
              <TableHead key={h} className={align?.[i] === "right" ? "text-right" : undefined}>
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
// The tooltip only reports the picked manager, since twelve rows of numbers go unread.
export function HighlightLines({
  data,
  xKey,
  managers,
  highlighted,
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
  reversed?: boolean
  domain?: [number, number]
  ticks?: number[]
  unit?: string
  // An additional named series drawn in orange (e.g. the league median)
  extra?: { key: string; label: string }
}) {
  const config = {
    [highlighted]: { label: highlighted, theme: SERIES.blue },
    ...(extra && { [extra.key]: { label: extra.label, theme: SERIES.orange } }),
  } satisfies ChartConfig
  const others = managers.filter((m) => m !== highlighted)

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
              payload={payload?.filter((p) => p.dataKey === highlighted || p.dataKey === extra?.key)}
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
            strokeOpacity={0.3}
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
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

export function Legend({ items }: { items: { label: string; color: { light: string; dark: string } | "muted" }[] }) {
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
    </div>
  )
}
