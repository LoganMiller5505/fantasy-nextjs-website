"use client"

import * as React from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Scope } from "../_lib/stats"

export const scopeLabel = (s: Scope) => (s === "all" ? "All-time" : String(s))

// A page's season scope. It starts from the ?season= the server read and is written back to the
// URL as it changes, so a link or a reload opens the same view.
export function useScope<T extends Scope>(initial: T) {
  const [scope, setScope] = React.useState<T>(initial)
  const change = (next: T) => {
    setScope(next)
    const params = new URLSearchParams(window.location.search)
    params.set("season", String(next))
    window.history.replaceState(null, "", `?${params}`)
  }
  return [scope, change] as const
}

// One choice from a handful (five or fewer), with every option in view. Longer lists use a Select.
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = "default",
  format = String,
}: {
  value: T
  options: readonly T[]
  onChange: (value: T) => void
  label: string
  size?: "sm" | "default"
  format?: (value: T) => string
}) {
  return (
    <ToggleGroup
      aria-label={label}
      variant="outline"
      size={size}
      spacing={0}
      value={[String(value)]}
      // Pressing the selected item again would leave nothing selected; keep it instead
      onValueChange={(pressed) => {
        const next = options.find((o) => String(o) === pressed[0])
        if (next != null) onChange(next)
      }}
    >
      {options.map((o) => (
        <ToggleGroupItem key={String(o)} value={String(o)} className="tabular-nums">
          {format(o)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

// A choice of season, or all-time
export function ScopeToggle<T extends Scope>({
  size = "sm",
  ...props
}: {
  value: T
  options: readonly T[]
  onChange: (value: T) => void
  size?: "sm" | "default"
}) {
  return <Segmented label="Season" format={scopeLabel} size={size} {...props} />
}

// The bar at the top of a page for the controls that apply to every panel on it (the season and
// the highlighted manager). It sticks under the site header so they stay in reach on long pages.
export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/90 sticky top-14 z-40 -mx-4 -mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 backdrop-blur">
      {children}
    </div>
  )
}
