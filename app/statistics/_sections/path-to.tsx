"use client"

import * as React from "react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { unpack, type PathResult, type Paths } from "../_lib/paths"
import { ordinal, record } from "../_lib/stats"
import { Panel, Picker, SimpleTable, oddsFmt } from "../_components/ui"

// Pick a manager and an outcome, then see how it happens: the most common ways the simulations got
// there and the remaining games that matter most for it. The manager follows the page's highlight
// until one is picked here.
export function PathTo({
  paths,
  runs,
  spots,
  divisionSeeds,
  highlighted,
}: {
  paths: Paths
  runs: number
  spots: number
  divisionSeeds: number
  highlighted: string | null
}) {
  const managers = Object.keys(paths.byManager).sort()
  const [picked, setPicked] = React.useState<string | null>(null)
  // A new highlight takes over again
  const [lastHighlight, setLastHighlight] = React.useState(highlighted)
  if (highlighted !== lastHighlight) {
    setLastHighlight(highlighted)
    setPicked(null)
  }
  const manager = picked ?? highlighted ?? managers[0]
  const mine = paths.byManager[manager]
  const [key, setKey] = React.useState("playoffs")
  const outcome = mine.outcomes.find((o) => o.key === key) ?? mine.outcomes[0]
  const labels = new Map(mine.outcomes.map((o) => [o.key, o.label]))

  const result = (r: PathResult) => {
    const { g, homeWon } = unpack(r)
    const x = paths.games[g]
    return `${homeWon ? x.home : x.away} beats ${homeWon ? x.away : x.home} (${x.week})`
  }
  const goes = (won: number, lost: number) =>
    `${manager} goes ${record(won, lost)} (${record(mine.wins + won, mine.losses + lost)})`
  const final = (won: number, lost: number) => record(mine.wins + won, mine.losses + lost)
  // The example season's record for the manager, in words
  const longShotRecord = (won: number, lost: number) =>
    lost === 0
      ? `if ${manager} wins out (${final(won, lost)})`
      : won === 0
        ? `if ${manager} loses out (${final(won, lost)})`
        : `if ${manager} goes ${record(won, lost)} (${final(won, lost)})`
  const other = 100 - outcome.scenarios.reduce((sum, s) => sum + s.share, 0)
  // A season's results in week order, each week's own list
  const byWeek = (results: PathResult[]) => {
    const weeks = new Map<string, { r: PathResult; winner: string; loser: string }[]>()
    for (const r of results) {
      const { g, homeWon } = unpack(r)
      const x = paths.games[g]
      const list = weeks.get(x.week) ?? []
      list.push({ r, winner: homeWon ? x.home : x.away, loser: homeWon ? x.away : x.home })
      weeks.set(x.week, list)
    }
    return [...weeks].sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
  }

  return (
    <Panel
      title={`${manager}: ${outcome.label}`}
      description="Pick a manager and an outcome to see the likeliest ways it happens, and which of the remaining games matter most for it."
      method={`From the same ${runs.toLocaleString("en-US")} simulated seasons as the playoff odds. Paths group the seasons where the outcome happens by the manager's own record from here and the results of the three other games that move its odds the most; the share is how many of those seasons each path covers. A game's odds are how often the outcome happens after each result. A 0% or 100% is checked against every way the remaining games could go, and for an outcome no simulated season reached, that same search supplies one way it can still happen: one where the manager finishes alone on their record if it can find one, so points for doesn't come into it, then one where they win or lose out.`}
      controls={
        <>
          <Picker label="Manager" value={manager} options={managers} onChange={setPicked} />
          <Picker
            label="Outcome"
            value={outcome.key}
            options={mine.outcomes.map((o) => o.key)}
            format={(k) => labels.get(k) ?? k}
            onChange={setKey}
            className="min-w-44"
          />
        </>
      }
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold tabular-nums">{oddsFmt(outcome.odds)}</span>
          <span className="text-muted-foreground text-sm">
            chance {manager} will {outcome.label.charAt(0).toLowerCase() + outcome.label.slice(1)}
          </span>
          {outcome.state && (
            <Badge variant={outcome.state === "certain" ? "secondary" : "outline"}>
              {outcome.state === "certain" ? "Locked in" : "Not possible"}
            </Badge>
          )}
        </div>

        {outcome.state === "certain" && (
          <p className="text-muted-foreground text-sm">Every way the remaining games can go gets {manager} there.</p>
        )}
        {outcome.state === "impossible" && (
          <p className="text-muted-foreground text-sm">No combination of the remaining results gets {manager} there.</p>
        )}

        {outcome.scenarios.length > 0 && (
          <div className="grid gap-2">
            <h4 className="text-sm font-medium">Likeliest paths</h4>
            <ol className="grid gap-2">
              {outcome.scenarios.map((s, i) => (
                <li key={i} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 text-sm">
                  <span className="text-right font-medium tabular-nums">{oddsFmt(s.share)}</span>
                  <span>
                    {[goes(s.won, s.lost), ...s.results.map(result)].join(" · ")}
                    <span className="text-muted-foreground"> · {oddsFmt(s.chance)} of all seasons</span>
                  </span>
                </li>
              ))}
              {other >= 0.5 && (
                <li className="text-muted-foreground grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 text-sm">
                  <span className="text-right tabular-nums">{oddsFmt(other)}</span>
                  <span>Other combinations</span>
                </li>
              )}
            </ol>
            <p className="text-muted-foreground text-xs">Share of the simulated seasons where it happens that follow each path.</p>
          </div>
        )}

        {(outcome.own.length > 0 || outcome.games.length > 0) && (
          <div className="grid gap-2">
            <h4 className="text-sm font-medium">Games that matter</h4>
            <div className="grid gap-4 lg:grid-cols-2">
              {outcome.own.length > 0 && (
                <div className="grid content-start gap-2">
                  <h5 className="text-muted-foreground text-xs font-medium">{manager}&apos;s games</h5>
                  <SimpleTable
                    head={["Week", "Opponent", "With a win", "With a loss"]}
                    align={["left", "left", "right", "right"]}
                    rows={outcome.own.map(({ g, ifWin, ifLose }) => {
                      const x = paths.games[g]
                      return [x.week, x.home === manager ? x.away : x.home, oddsFmt(ifWin), oddsFmt(ifLose)]
                    })}
                  />
                </div>
              )}
              {outcome.games.length > 0 && (
                <div className="grid content-start gap-2">
                  <h5 className="text-muted-foreground text-xs font-medium">Around the league: who to root for</h5>
                  <SimpleTable
                    head={["Week", "Root for", "Over", "If they win", "If they lose"]}
                    align={["left", "left", "left", "right", "right"]}
                    rows={outcome.games.map(({ g, ifHome, ifAway }) => {
                      const x = paths.games[g]
                      const [root, over, ifWin, ifLose] =
                        ifHome >= ifAway ? [x.home, x.away, ifHome, ifAway] : [x.away, x.home, ifAway, ifHome]
                      return [x.week, root, over, oddsFmt(ifWin), oddsFmt(ifLose)]
                    })}
                  />
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              The chance {manager} gets there after each result. Other games are the ones that move it most.
            </p>
          </div>
        )}
        {!outcome.state && outcome.scenarios.length > 0 && outcome.own.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Too few simulated seasons got there to say which other games matter.
          </p>
        )}

        {outcome.longShot && (
          <div className="grid gap-2 text-sm">
            <p>
              None of the {runs.toLocaleString("en-US")} simulated seasons got there, but it can still happen. For
              example, {longShotRecord(outcome.longShot.won, outcome.longShot.lost)}, with the other results falling as
              below. That&apos;s one season where it works, not the only one: other records and results can get there
              too.
            </p>
            {outcome.longShot.tiebreak && (
              <p className="text-muted-foreground">
                In this example {manager} finishes level on wins with someone, so points for has to break their way
                too.
              </p>
            )}
            <details>
              <summary className="text-muted-foreground cursor-pointer">The final standings and every result in that season</summary>
              <div className="mt-3 grid gap-2">
                <h5 className="text-muted-foreground text-xs font-medium">Standings if this happened</h5>
                <SimpleTable
                  head={["Seed", "Manager", "Record", ...(divisionSeeds ? ["Division"] : [])]}
                  align={["left", "left", "right", ...(divisionSeeds ? (["left"] as const) : [])]}
                  highlight={(i) => outcome.longShot!.standings[i].manager === manager}
                  rows={outcome.longShot.standings.map((t, i) => [
                    i < spots ? ordinal(i + 1) : <span key="out" className="text-muted-foreground">Out</span>,
                    t.manager,
                    `${record(t.won, t.lost)}${t.tied ? "*" : ""}`,
                    ...(divisionSeeds ? [i < divisionSeeds ? `${t.division} (winner)` : (t.division ?? "")] : []),
                  ])}
                />
                <p className="text-muted-foreground text-xs">
                  {divisionSeeds ? `Division winners take seeds 1–${divisionSeeds}. ` : ""}
                  {outcome.longShot.standings.some((t) => t.tied)
                    ? "* Level on wins, so points for decides; this is the order it would need to fall in."
                    : ""}
                </p>
              </div>
              <h5 className="text-muted-foreground mt-4 mb-2 text-xs font-medium">Every result</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byWeek(outcome.longShot.results).map(([week, results]) => (
                  <div key={week} className="rounded-md border p-3">
                    <div className="text-muted-foreground mb-2 text-xs font-medium">{week}</div>
                    <ul className="grid gap-1">
                      {results.map(({ r, winner, loser }) => {
                        const mine = winner === manager || loser === manager
                        return (
                          <li
                            key={r}
                            className={cn(
                              "-mx-1.5 flex items-baseline justify-between gap-2 rounded px-1.5 py-0.5",
                              mine && "bg-[color-mix(in_oklab,var(--highlight)_14%,var(--card))]"
                            )}
                          >
                            <span className="font-medium">{winner}</span>
                            <span className="text-muted-foreground text-xs">beat {loser}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
        {!outcome.state && !outcome.scenarios.length && !outcome.longShot && (
          <p className="text-muted-foreground text-sm">
            Still possible as far as the search could tell, but it couldn&apos;t find an example in time.
          </p>
        )}
      </div>
    </Panel>
  )
}
