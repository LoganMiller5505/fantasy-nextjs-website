"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trophy } from "lucide-react"
import { createColumnHelper } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "../_components/data-table"
import { type DataTableFeatures } from "../_components/data-table-features"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { Toolbar } from "../_components/scope"
import { SortableHeader, numeric, points, sortFn_record } from "../_components/table-helpers"
import { ManagerLink, Panel, Section, SimpleTable, StatTile, TileGrid, fmt, pctFmt } from "../_components/ui"
import type { ManagerProfile, Opponent } from "../_lib/managers"
import type { Scope, careers, winPctByWeek } from "../_lib/stats"
import { CareersView } from "./careers"

const signed = (x: number, places = 1) => `${x > 0 ? "+" : ""}${fmt(x, places)}`

// "player" so DataTable gives it the Rows menu and keeps it pinned while scrolling sideways
const columnHelper = createColumnHelper<DataTableFeatures, Opponent>()
const opponentColumns = columnHelper.columns([
  columnHelper.accessor((r) => r.opponent, {
    id: "player",
    header: ({ column }) => <SortableHeader column={column} title="Opponent" />,
    enableHiding: false,
    filterFn: "excludes",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        <ManagerLink manager={row.original.opponent} />
        {row.original.tag && <Badge variant="outline">{row.original.tag}</Badge>}
      </span>
    ),
  }),
  columnHelper.accessor("games", {
    id: "Meetings",
    header: ({ column }) => <SortableHeader column={column} title="Meetings" />,
    ...numeric,
  }),
  columnHelper.accessor("record", {
    id: "Record",
    header: ({ column }) => <SortableHeader column={column} title="Record" />,
    sortFn: sortFn_record,
    sortDescFirst: true,
    meta: { align: "right" },
  }),
  columnHelper.accessor("pct", {
    id: "Win %",
    header: ({ column }) => <SortableHeader column={column} title="Win %" />,
    ...numeric,
    cell: ({ getValue }) => pctFmt(getValue()),
  }),
  columnHelper.accessor("pf", {
    id: "PF",
    header: ({ column }) => <SortableHeader column={column} title="PF" />,
    ...numeric,
    cell: ({ getValue }) => points(getValue()),
  }),
  columnHelper.accessor("pa", {
    id: "PA",
    header: ({ column }) => <SortableHeader column={column} title="PA" />,
    ...numeric,
    cell: ({ getValue }) => points(getValue()),
  }),
  columnHelper.accessor("margin", {
    id: "Avg margin",
    header: ({ column }) => <SortableHeader column={column} title="Avg margin" />,
    ...numeric,
    cell: ({ getValue }) => signed(getValue()),
  }),
  columnHelper.accessor("last", {
    id: "Last meeting",
    header: ({ column }) => <SortableHeader column={column} title="Last meeting" />,
    enableSorting: false,
  }),
])

function Profile({ p }: { p: ManagerProfile }) {
  const streakLabel = p.active ? "Current streak" : "Last streak"
  return (
    <Section
      title={p.manager}
      description={`${p.span} · ${p.seasonCount} season${p.seasonCount === 1 ? "" : "s"}${p.active ? "" : " · former manager"}. Every game counts, playoffs included, unless a panel says otherwise.`}
    >
      <TileGrid>
        <StatTile label="Career record" value={p.career.record} detail={`${pctFmt(p.career.pct)} win %`} />
        <StatTile
          label="Titles"
          value={
            <span className="inline-flex items-center gap-1.5">
              {p.titles > 0 && <Trophy className="size-5" aria-hidden />}
              {p.titles}
            </span>
          }
          detail={`${p.finals} final${p.finals === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Playoff trips"
          value={p.bracketSeasons ? `${p.playoffTrips} of ${p.bracketSeasons}` : "—"}
          detail="Finished seasons only"
        />
        <StatTile
          label="Best regular season"
          value={p.bestSeason?.finish ?? "—"}
          detail={p.bestSeason ? `${p.bestSeason.year} (${p.bestSeason.record})` : "No finished regular season yet"}
        />
        <StatTile
          label="Highest score"
          value={p.highest ? fmt(p.highest.pf) : "—"}
          detail={p.highest ? `vs ${p.highest.opponent}, ${p.highest.year} ${p.highest.short}` : ""}
        />
        <StatTile
          label={streakLabel}
          value={p.currentStreak ? `${p.currentStreak.kind}${p.currentStreak.length}` : "—"}
          detail={p.currentStreak ? `Since ${p.currentStreak.from}` : ""}
        />
        <StatTile
          label="Longest win streak"
          value={p.longestWin?.length ?? 0}
          detail={p.longestWin ? `${p.longestWin.from} → ${p.longestWin.to}` : "No wins yet"}
        />
        <StatTile label="Luck" value={`${signed(p.luck)} wins`} detail="Above or below expected, regular season" />
      </TileGrid>
      <Panel
        title="Season by season"
        description="Regular-season record and place, scoring rank and luck, then how the playoffs went."
        method="Place is by record, then points for. PPG skips double weeks. Luck is wins minus expected wins, as on the Luck page. A season still under way shows where things stand now."
      >
        <SimpleTable
          head={["Season", "Record", "Place", "PPG", "PPG rank", "Luck", "Playoffs"]}
          align={["left", "right", "right", "right", "right", "right", "left"]}
          rows={p.seasons.map((s) => [
            s.year,
            s.record,
            s.over ? s.finish : `${s.finish} so far`,
            s.ppg == null ? "—" : fmt(s.ppg, 1),
            s.ppgRank ?? "—",
            s.luck == null ? "—" : signed(s.luck),
            s.playoffs === "Champion" ? (
              <span key="c" className="inline-flex items-center gap-1 font-medium">
                <Trophy className="size-3.5" aria-hidden />
                Champion
              </span>
            ) : (
              <span key="p" className={s.playoffs === "Missed" || s.playoffs === "In progress" ? "text-muted-foreground" : undefined}>
                {s.playoffs}
              </span>
            ),
          ])}
        />
      </Panel>
      <Panel
        title="Against each opponent"
        description="Every opponent faced, best record first."
        method="Nemesis and favourite victim are the worst and best records against one opponent, as on Head-to-head: at least two meetings, ties to the opponent played most, then the bigger points gap."
      >
        <DataTable columns={opponentColumns} data={p.opponents} initialSorting={[{ id: "Win %", desc: true }]} />
      </Panel>
    </Section>
  )
}

// Every manager's career for comparison, under either page
function EveryManager({
  data,
  scopes,
  byWeek,
  highlighted,
  onPick,
}: {
  data: ReturnType<typeof careers>
  scopes: Scope[]
  byWeek: Record<string, ReturnType<typeof winPctByWeek>>
  highlighted: string | null
  // Clicking a manager's line opens their page, as picking them does
  onPick: (manager: string) => void
}) {
  return (
    <Section title="Every manager" description="Tap a name to open their page.">
      <CareersView data={data} scopes={scopes} byWeek={byWeek} highlighted={highlighted} onPick={onPick} />
    </Section>
  )
}

const profileHref = (m: string) => `/statistics/managers/${encodeURIComponent(m)}`

// /statistics/managers: a list to pick from. With someone highlighted it goes straight to their page.
export function ManagersIndex({
  careers: data,
  scopes,
  byWeek,
}: {
  careers: ReturnType<typeof careers>
  scopes: Scope[]
  byWeek: Record<string, ReturnType<typeof winPctByWeek>>
}) {
  const [highlighted, setHighlighted] = useHighlight(data.managers)
  const router = useRouter()
  React.useEffect(() => {
    if (highlighted) router.replace(profileHref(highlighted))
  }, [highlighted, router])
  const active = data.rows.filter((r) => r.active).map((r) => r.manager)
  const former = data.rows.filter((r) => !r.active).map((r) => r.manager)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <HighlightPicker managers={data.managers} value={highlighted} onChange={setHighlighted} />
      </Toolbar>
      <Section title="Pick a manager" description="Each manager has their own page. Highlight yourself above and this tab opens yours.">
        <div className="grid gap-3">
          {[active, former].map(
            (group, i) =>
              group.length > 0 && (
                <div key={i} className="grid gap-1.5">
                  {i === 1 && <p className="text-muted-foreground text-sm">Former managers</p>}
                  <div className="flex flex-wrap gap-2">
                    {group.map((m) => (
                      <Button key={m} variant="outline" size="sm" render={<Link href={profileHref(m)} />} nativeButton={false}>
                        {m}
                      </Button>
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      </Section>
      <EveryManager data={data} scopes={scopes} byWeek={byWeek} highlighted={highlighted} onPick={setHighlighted} />
    </div>
  )
}

// /statistics/managers/[manager]: one manager's page, with its own address so it can be shared.
// The Highlight is the manager choice here: the page's manager is the highlighted one (opening a
// page highlights them), picking another opens their page, and None goes back to the list.
export function ManagerPage({
  profile,
  careers: data,
  scopes,
  byWeek,
}: {
  profile: ManagerProfile
  careers: ReturnType<typeof careers>
  scopes: Scope[]
  byWeek: Record<string, ReturnType<typeof winPctByWeek>>
}) {
  const [, setHighlighted] = useHighlight(data.managers)
  const router = useRouter()
  React.useEffect(() => setHighlighted(profile.manager), [profile.manager, setHighlighted])
  const pick = (m: string | null) => {
    setHighlighted(m)
    router.push(m ? profileHref(m) : "/statistics/managers")
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <HighlightPicker managers={data.managers} value={profile.manager} onChange={pick} />
      </Toolbar>
      <Profile p={profile} />
      <EveryManager data={data} scopes={scopes} byWeek={byWeek} highlighted={profile.manager} onPick={pick} />
    </div>
  )
}
