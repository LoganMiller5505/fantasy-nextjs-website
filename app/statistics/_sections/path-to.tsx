"use client"

import * as React from "react"
import { cn } from "cn"
import { Ban, Check, Lock, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { unpack, type PathOutcome, type PathResult, type Paths } from "../_lib/paths"
import { ordinal, record } from "../_lib/stats"
import { DotPlot, Panel, Picker, SERIES, SimpleTable, StatTile, TileGrid, oddsFmt } from "../_components/ui"

// The highlighted manager's tint, as on highlighted table rows
const TINT = "bg-[color-mix(in_oklab,var(--highlight)_14%,var(--card))]"

// Short names for the outcome chips
const chipLabel = (o: PathOutcome) =>
  o.key.startsWith("seed-")
    ? ordinal(Number(o.key.slice(5)))
    : ({ playoffs: "Playoffs", division: "Win division", bye: "Bye", miss: "Miss playoffs" } as Record<string, string>)[o.key] ?? o.label

// What the icons on the outcome chips mean
const LEGEND = [
  { Icon: Check, text: "in their own hands: winning out guarantees it." },
  { Icon: Sparkles, text: "long shot: no simulated season got there, but it can still happen." },
]

// Pick a manager and an outcome, then see how it happens: the odds and whether it's in their own
// hands, the records it takes, the games that matter most, and for a long shot one season where it
// still works. The page owns the choice, so the "Where they finish" grid can open any manager and
// outcome here.
export function PathTo({
  paths,
  runs,
  spots,
  divisionSeeds,
  manager,
  outcome: key,
  onManager,
  onOutcome,
}: {
  paths: Paths
  runs: number
  spots: number
  divisionSeeds: number
  manager: string
  outcome: string
  onManager: (manager: string) => void
  onOutcome: (key: string) => void
}) {
  const managers = Object.keys(paths.byManager).sort()
  const mine = paths.byManager[manager]
  const outcome = mine.outcomes.find((o) => o.key === key) ?? mine.outcomes[0]
  const gamesLeft = paths.games.filter((x) => x.home === manager || x.away === manager).length
  const final = (won: number, lost: number) => record(mine.wins + won, mine.losses + lost)
  const lower = outcome.label.charAt(0).toLowerCase() + outcome.label.slice(1)
  const outcomes = mine.outcomes.filter((o) => !o.key.startsWith("seed-"))
  const seeds = mine.outcomes.filter((o) => o.key.startsWith("seed-"))

  return (
    <Panel
      id="path-to"
      title={`${manager}: ${outcome.label}`}
      description="Pick a manager and an outcome to see how likely it is, whether it's in their own hands, the records it takes and the games that matter most for it."
      method={`From the same ${runs.toLocaleString("en-US")} simulated seasons as the playoff odds. A game's odds are how often the outcome happens after each result. "In their hands" means winning out guarantees it and "needs help" means even winning out can fall short; both, like any 0% or 100%, are checked against every way the remaining games could go. For an outcome no simulated season reached, that same search supplies one season where it still happens, preferring one where the manager finishes alone on their record.`}
      controls={<Picker label="Manager" value={manager} options={managers} onChange={onManager} />}
    >
      <div className="grid gap-6">
        <div className="grid gap-2">
          {[outcomes, seeds].map((group, i) =>
            group.length ? (
              <ToggleGroup
                key={i}
                aria-label={i ? "Seed" : "Outcome"}
                variant="outline"
                spacing={2}
                className="flex-wrap"
                value={group.some((o) => o.key === outcome.key) ? [outcome.key] : []}
                // Pressing the selected chip again would leave nothing selected; keep it instead
                onValueChange={(pressed) => pressed[0] && onOutcome(pressed[0])}
              >
                {group.map((o) => (
                  <ToggleGroupItem
                    key={o.key}
                    value={o.key}
                    className="aria-pressed:border-foreground/40 h-auto min-w-16 flex-col items-start gap-0 px-2.5 py-1.5"
                  >
                    <span className="flex items-center gap-1 text-xs font-medium">
                      {chipLabel(o)}
                      {o.state === "certain" && <Lock className="size-3" aria-label="Locked in" />}
                      {o.destiny === "controls" && <Check className="size-3 text-(--highlight)" aria-label="In their hands" />}
                      {o.longShot && <Sparkles className="size-3 text-(--highlight)" aria-label="Long shot" />}
                    </span>
                    <span className={cn("text-muted-foreground text-[0.7rem] tabular-nums", o.state === "impossible" && "line-through")}>
                      {oddsFmt(o.odds)}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ) : null
          )}
          <p className="text-muted-foreground text-xs">
            {LEGEND.map(({ Icon, text }, i) => (
              <React.Fragment key={text}>
                {i > 0 && " "}
                <Icon className={cn("inline size-3 text-(--highlight)", i > 0 && "ml-2")} aria-hidden /> {text}
              </React.Fragment>
            ))}
          </p>
        </div>

        {outcome.state ? (
          <div className="flex items-start gap-3 rounded-lg border p-4 text-sm">
            {outcome.state === "certain" ? (
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <Ban className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <div className="grid gap-0.5">
              <p className="font-medium">
                {outcome.state === "certain" ? `${manager} will ${lower}: locked in` : `${manager} can't ${lower} any more`}
              </p>
              <p className="text-muted-foreground">
                {outcome.state === "certain"
                  ? `Every way the remaining games can go gets ${manager} there.`
                  : `No combination of the remaining results gets ${manager} there.`}
              </p>
            </div>
          </div>
        ) : (
          <>
            <Headline outcome={outcome} manager={manager} record={record(mine.wins, mine.losses)} gamesLeft={gamesLeft} final={final} />
            {outcome.records.length > 1 && <RecordsItTakes outcome={outcome} lower={lower} final={final} />}
            {(outcome.own.length > 0 || outcome.games.length > 0) && (
              <GamesThatMatter outcome={outcome} manager={manager} paths={paths} />
            )}
            {outcome.reached && outcome.own.length === 0 && (
              <p className="text-muted-foreground text-sm">Too few simulated seasons got there to say which games matter.</p>
            )}
            {outcome.longShot && (
              <LongShot
                key={`${manager}|${outcome.key}`}
                outcome={outcome}
                manager={manager}
                paths={paths}
                runs={runs}
                spots={spots}
                divisionSeeds={divisionSeeds}
                final={final}
              />
            )}
            {!outcome.reached && !outcome.longShot && (
              <p className="text-muted-foreground text-sm">
                Still possible as far as the search could tell, but it couldn&apos;t find an example in time.
              </p>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}

type Final = (won: number, lost: number) => string

// Chance, record now, the usual finish, and whether it's in their own hands
function Headline({
  outcome,
  manager,
  record: now,
  gamesLeft,
  final,
}: {
  outcome: PathOutcome
  manager: string
  record: string
  gamesLeft: number
  final: Final
}) {
  const usual = outcome.records[0]
  const winOut = final(gamesLeft, 0)
  const destiny =
    outcome.destiny === "controls"
      ? { value: "In their hands", detail: `Winning out (${winOut}) guarantees it` }
      : outcome.destiny === "needs-help"
        ? {
            value: "Needs help",
            detail: outcome.ifWinOut != null ? `Even winning out (${winOut}): ${oddsFmt(outcome.ifWinOut)}` : "Winning out isn't enough on its own",
          }
        : null
  return (
    <TileGrid wide={destiny ? 4 : 3}>
      <StatTile label="Chance" value={oddsFmt(outcome.odds)} detail={`${manager} to ${outcome.label.charAt(0).toLowerCase() + outcome.label.slice(1)}`} />
      <StatTile label="Record now" value={now} detail={`${gamesLeft} game${gamesLeft === 1 ? "" : "s"} left`} />
      <StatTile
        label={usual || !outcome.longShot ? "Most common finish" : "Example finish"}
        value={usual ? final(usual.won, usual.lost) : outcome.longShot ? final(outcome.longShot.won, outcome.longShot.lost) : "—"}
        detail={usual ? `${oddsFmt(usual.share)} of the ways it happens` : outcome.longShot ? "In the example season below" : "Too few seasons to say"}
      />
      {destiny && <StatTile label="Destiny" value={destiny.value} detail={destiny.detail} />}
    </TileGrid>
  )
}

// A share as a filled bar with its percentage in front
function ShareBar({ share }: { share: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">{oddsFmt(share)}</span>
      <span className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-(--highlight)"
          style={{ width: `${Math.max(2, share)}%` }}
        />
      </span>
    </span>
  )
}

// The final records the manager finishes on when it happens
function RecordsItTakes({ outcome, lower, final }: { outcome: PathOutcome; lower: string; final: Final }) {
  const records = [...outcome.records].sort((a, b) => b.won - a.won)
  return (
    <div className="grid gap-3">
      <h4 className="text-sm font-medium">Most likely records to {lower}</h4>
      <ul className="grid gap-1.5">
        {records.map((r) => (
          <li
            key={r.won}
            className="grid grid-cols-[3.5rem_5rem_minmax(0,1fr)] items-center gap-3 text-sm sm:grid-cols-[3.5rem_5rem_minmax(0,24rem)]"
          >
            <span className="tabular-nums">{final(r.won, r.lost)}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {r.lost === 0 ? "wins out" : r.won === 0 ? "loses out" : `goes ${record(r.won, r.lost)}`}
            </span>
            <ShareBar share={r.share} />
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">Final records across the simulated seasons where it happens, and what that means from here.</p>
    </div>
  )
}

// The manager's own games, then each week's other game that moves the odds most, as win/loss dumbbells
function GamesThatMatter({ outcome, manager, paths }: { outcome: PathOutcome; manager: string; paths: Paths }) {
  const swing = (a: number, b: number) => `${Math.round(a - b) > 0 ? "+" : ""}${Math.round(a - b)}`
  return (
    <div className="grid gap-3">
      <h4 className="text-sm font-medium">Games that matter</h4>
      <div className="grid gap-6 lg:grid-cols-2">
        {outcome.own.length > 0 && (
          <div className="grid content-start gap-2">
            <h5 className="text-muted-foreground text-xs font-medium">{manager}&apos;s games</h5>
            <DotPlot
              connect
              domain={[0, 100]}
              format={oddsFmt}
              step={25}
              labelWidth="7rem"
              trailingLabel="Swing"
              series={[
                { key: "win", label: "With a win", color: SERIES.blue },
                { key: "loss", label: "With a loss", color: SERIES.red },
              ]}
              rows={outcome.own.map(({ g, ifWin, ifLose }) => {
                const x = paths.games[g]
                const opponent = x.home === manager ? x.away : x.home
                return {
                  key: String(g),
                  label: `${x.week} · vs ${opponent}`,
                  values: { win: ifWin, loss: ifLose },
                  summary: `${x.week} against ${opponent}: ${oddsFmt(ifWin)} with a win, ${oddsFmt(ifLose)} with a loss`,
                  trailing: swing(ifWin, ifLose),
                }
              })}
            />
          </div>
        )}
        {outcome.games.length > 0 && (
          <div className="grid content-start gap-2">
            <h5 className="text-muted-foreground text-xs font-medium">Most important game each week</h5>
            <DotPlot
              connect
              domain={[0, 100]}
              format={oddsFmt}
              step={25}
              labelWidth="10rem"
              trailingLabel="Swing"
              series={[
                { key: "win", label: "If they win", color: SERIES.blue },
                { key: "loss", label: "If they lose", color: SERIES.red },
              ]}
              rows={outcome.games.map(({ g, ifHome, ifAway }) => {
                const x = paths.games[g]
                const [root, over, ifWin, ifLose] =
                  ifHome >= ifAway ? [x.home, x.away, ifHome, ifAway] : [x.away, x.home, ifAway, ifHome]
                return {
                  key: String(g),
                  label: `${x.week} · ${root} over ${over}`,
                  values: { win: ifWin, loss: ifLose },
                  summary: `${x.week}, root for ${root} over ${over}: ${oddsFmt(ifWin)} if they win, ${oddsFmt(ifLose)} if they lose`,
                  trailing: swing(ifWin, ifLose),
                }
              })}
            />
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        The chance {manager} gets there after each result; swing is the gap in points. For each week, the other game that moves it most.
      </p>
    </div>
  )
}

// An outcome no simulated season reached: one season where it still happens, as final standings
// and every result
function LongShot({
  outcome,
  manager,
  paths,
  runs,
  spots,
  divisionSeeds,
  final,
}: {
  outcome: PathOutcome
  manager: string
  paths: Paths
  runs: number
  spots: number
  divisionSeeds: number
  final: Final
}) {
  const shot = outcome.longShot!
  const how =
    shot.lost === 0
      ? `wins out (${final(shot.won, shot.lost)})`
      : shot.won === 0
        ? `loses out (${final(shot.won, shot.lost)})`
        : `goes ${record(shot.won, shot.lost)} (${final(shot.won, shot.lost)})`
  // Each week's results, the manager's own game first
  const weeks = new Map<string, { r: PathResult; winner: string; loser: string; mine: boolean }[]>()
  for (const r of shot.results) {
    const { g, homeWon } = unpack(r)
    const x = paths.games[g]
    const [winner, loser] = homeWon ? [x.home, x.away] : [x.away, x.home]
    const list = weeks.get(x.week) ?? []
    list.push({ r, winner, loser, mine: winner === manager || loser === manager })
    weeks.set(x.week, list)
  }
  const byWeek = [...weeks]
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(([week, list]) => [week, list.sort((a, b) => Number(b.mine) - Number(a.mine))] as const)

  return (
    <div className="grid gap-3 rounded-lg border border-dashed p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Long shot</Badge>
        <span className="text-sm font-medium">
          Can still happen, for example if {manager} {how}
        </span>
      </div>
      <p className="text-muted-foreground text-sm">
        None of the {runs.toLocaleString("en-US")} simulated seasons got there. This is one season where it works, not the only one.
        {shot.tiebreak && ` ${manager} finishes level on wins with someone in it, so points for has to break their way too.`}
      </p>
      <Tabs defaultValue="standings">
        <TabsList>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="results">Every result</TabsTrigger>
        </TabsList>
        <TabsContent value="standings" className="grid gap-2 pt-1">
          <SimpleTable
            head={["Seed", "Manager", "Record", ...(divisionSeeds ? ["Division"] : [])]}
            align={["left", "left", "right", ...(divisionSeeds ? (["left"] as const) : [])]}
            highlight={(i) => shot.standings[i].manager === manager}
            divider={spots < shot.standings.length ? { before: spots, label: "Playoff line" } : undefined}
            rows={shot.standings.map((t, i) => [
              i < spots ? ordinal(i + 1) : <span key="out" className="text-muted-foreground">Out</span>,
              t.manager,
              <span key="record" className="inline-flex items-center justify-end gap-1.5">
                {t.tied && (
                  <Badge variant="outline" className="h-4 px-1 text-[0.65rem]">
                    tied
                  </Badge>
                )}
                {record(t.won, t.lost)}
              </span>,
              ...(divisionSeeds
                ? [
                    <span key="division" className="inline-flex items-center gap-1.5">
                      {t.division}
                      {i < divisionSeeds && (
                        <Badge variant="secondary" className="h-4 px-1 text-[0.65rem]">
                          Div. winner
                        </Badge>
                      )}
                    </span>,
                  ]
                : []),
            ])}
          />
          {shot.standings.some((t) => t.tied) && (
            <p className="text-muted-foreground text-xs">
              Tied: level on wins, so points for decides. The order shown is the one it would need to fall in.
            </p>
          )}
        </TabsContent>
        <TabsContent value="results" className="pt-1">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byWeek.map(([week, list]) => (
              <div key={week} className="rounded-md border p-3">
                <div className="text-muted-foreground mb-2 text-xs font-medium">{week}</div>
                <ul className="grid gap-1">
                  {list.map(({ r, winner, loser, mine }) => (
                    <li key={r} className={cn("-mx-1.5 flex items-baseline justify-between gap-2 rounded px-1.5 py-0.5", mine && TINT)}>
                      <span className="font-medium">{winner}</span>
                      <span className="text-muted-foreground text-xs">beat {loser}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
