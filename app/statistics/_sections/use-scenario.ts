"use client"

import * as React from "react"
import { decodePicks, encodePicks, type Pick } from "../_lib/picks"
import type { Race } from "../_lib/playoff-race"
import { scenarioRace } from "../outlook/actions"

export type Scenario = NonNullable<Awaited<ReturnType<typeof scenarioRace>>>

// The picks live in the URL (?whatif=), so a link or a reload opens the same what-if
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("popstate", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("popstate", listener)
  }
}
const readParam = () => new URLSearchParams(window.location.search).get("whatif") ?? ""
function writeParam(text: string) {
  const params = new URLSearchParams(window.location.search)
  if (/^-*$/.test(text)) params.delete("whatif")
  else params.set("whatif", text)
  const query = params.toString()
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname)
  listeners.forEach((l) => l())
}

// Wait this long after the last pick before asking the server, so a run of taps is one request
const SETTLE_MS = 400

// Outlook's what-if: the picks, and the race worked out with them in. While a new one is being
// worked out, the last one stays up (`pending`), so the page doesn't flash back to the odds now.
export function useScenario(race: Race | null) {
  const count = race?.paths.games.length ?? 0
  const text = React.useSyncExternalStore(subscribe, readParam, () => "")
  const picks = React.useMemo(() => decodePicks(text, count), [text, count])
  const key = encodePicks(picks)
  const active = picks.some(Boolean)

  const [result, setResult] = React.useState<{ key: string; race: Scenario | null; error: boolean } | null>(null)
  const latest = React.useRef(key)
  React.useEffect(() => {
    latest.current = key
    if (!active) return
    const timer = setTimeout(() => {
      // Only the answer for the latest picks counts; an earlier, slower one is dropped
      scenarioRace(key).then(
        (r) => latest.current === key && setResult({ key, race: r, error: false }),
        () => latest.current === key && setResult({ key, race: null, error: true })
      )
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [key, active])

  const pending = active && result?.key !== key
  return {
    picks,
    setPicks: (next: Pick[]) => writeParam(encodePicks(next)),
    active,
    pending,
    error: active && !pending && !!result?.error,
    scenario: active ? (result?.race ?? null) : null,
  }
}
