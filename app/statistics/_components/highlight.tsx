"use client"

import * as React from "react"
import { cn } from "cn"
import { Picker } from "./ui"

// The manager to pick out on every chart and table, shared by all the statistics pages. It's kept
// in sessionStorage, so it carries across tabs and reloads but every new visit starts with nobody
// highlighted. The server always renders with nobody.
const KEY = "statistics-highlight"
const listeners = new Set<() => void>()
// Earlier versions kept the pick in localStorage for good; drop it so nobody is stuck with a stale one
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
// Fallback for when storage is blocked
let memory: string | null = null

function read() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return memory
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function write(manager: string | null) {
  memory = manager
  try {
    if (manager == null) sessionStorage.removeItem(KEY)
    else sessionStorage.setItem(KEY, manager)
  } catch {
    // Storage blocked: the pick still holds until the page is left
  }
  listeners.forEach((l) => l())
}

// The highlighted manager, or null for nobody. A pick that isn't among `managers` (a former manager
// on a page about this season, say) highlights nobody here but is kept for the other pages.
export function useHighlight(managers: readonly string[]) {
  const stored = React.useSyncExternalStore(subscribe, read, () => null)
  const highlighted = stored != null && managers.includes(stored) ? stored : null
  return [highlighted, write] as const
}

// Full strength for the highlighted manager's marks and for everyone's when nobody is highlighted;
// the rest step back
export const emphasis = (manager: string, highlighted: string | null) =>
  highlighted == null || manager === highlighted ? 1 : 0.6

const NONE = "None"

// `end`: pushed to the right of the page toolbar, after the season choice. Alone, it sits left.
export function HighlightPicker({
  managers,
  value,
  onChange,
  end = false,
}: {
  managers: readonly string[]
  value: string | null
  onChange: (manager: string | null) => void
  end?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-2", end && "ml-auto")}>
      {/* The label makes room on phones; the Select keeps its own accessible name */}
      <span className="text-muted-foreground hidden text-sm sm:inline">Highlight</span>
      <Picker
        label="Highlighted manager"
        size="sm"
        placeholder="Pick a manager"
        value={value}
        options={[NONE, ...[...managers].sort()]}
        onChange={(m) => onChange(m === NONE ? null : m)}
      />
    </div>
  )
}
