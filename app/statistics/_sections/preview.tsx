"use client"

import * as React from "react"
import Link from "next/link"
import { HighlightPicker, useHighlight } from "../_components/highlight"
import { ScopeToggle, Toolbar, scopeLabel, useScope } from "../_components/scope"
import { Panel, Picker, Section } from "../_components/ui"
import type {
  DraftTabData,
  H2HAdditionsData,
  LineupsTabData,
  LuckAdditionsData,
  ManagerAdditionsData,
  OutlookAdditionsData,
  PlayoffsAdditionsData,
  RankingsAdditionsData,
  RecordsAdditionsData,
  ScoringAdditionsData,
  SeasonAdditionsData,
} from "../_lib/espn/additions"
import type { Scope } from "../_lib/stats"
import { DraftMovesSections } from "./additions/draft-moves"
import { H2HAdditions } from "./additions/h2h"
import { LineupsSections } from "./additions/lineups"
import { LuckAdditions } from "./additions/luck"
import { ManagerAdditions } from "./additions/manager"
import { OutlookAdditions } from "./additions/outlook"
import { PlayoffsAdditions } from "./additions/playoffs"
import { RankingsAdditions } from "./additions/rankings"
import { RecordsAdditions } from "./additions/records"
import { ScoringAdditions } from "./additions/scoring"
import { SeasonAdditions } from "./additions/season"

// Ideas the data can't support
const IMPOSSIBLE = [
  ["Injury status at the time", "ESPN only reports a player's injury status now, not what it was in a past week."],
  ["FAAB bidding", "The league uses traditional waivers, so there are no bids."],
  ["Keepers", "The league has never kept players."],
  ["ADP at draft time", "ESPN only reports average draft position as it is now."],
  ["Live win probability", "That needs play-by-play data; ESPN's league data has scores, not plays."],
  ["Seasons before 2024", "ESPN's data for the league starts in 2024."],
] as const

// One tab's additions, under the tab's name and a link to see them in place
function Group({ id, tab, href, note, children }: { id: string; tab: string; href: string; note?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="grid scroll-mt-28 grid-cols-[minmax(0,1fr)] gap-6 border-t pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{tab} tab</p>
        <Link href={href} className="text-sm underline-offset-2 hover:underline">
          See it on the {tab} tab →
        </Link>
        {note && <p className="text-muted-foreground w-full text-sm">{note}</p>}
      </div>
      {children}
    </div>
  )
}

// Every ESPN-based addition to the statistics pages in one place, grouped by the tab it lives on
export function PreviewView({
  initialScope,
  scopes,
  season,
  outlook,
  rankings,
  luck,
  lineups,
  h2h,
  scoring,
  draft,
  managers,
  playoffs,
  records,
}: {
  initialScope: Scope
  scopes: Scope[]
  season: SeasonAdditionsData
  outlook: OutlookAdditionsData
  rankings: RankingsAdditionsData
  luck: Record<string, LuckAdditionsData>
  lineups: Record<string, LineupsTabData>
  h2h: H2HAdditionsData
  scoring: Record<string, ScoringAdditionsData>
  draft: DraftTabData
  managers: Record<string, ManagerAdditionsData>
  playoffs: PlayoffsAdditionsData
  records: RecordsAdditionsData
}) {
  const [scope, setScope] = useScope(initialScope)
  const key = String(scope)
  const everyone = Object.keys(managers).sort()
  const [highlighted, setHighlighted] = useHighlight(everyone)
  const [picked, setPicked] = React.useState<string | null>(null)
  const manager = picked ?? highlighted ?? everyone[0]
  // Season-tab additions are one season's: all-time shows the latest
  const year = scope === "all" ? Math.max(...Object.keys(season.honours).map(Number)) : scope
  const unscoped = "This tab doesn't have a season choice, so this ignores the one above."
  const groups = [
    ["season", "Season"],
    ["outlook", "Outlook"],
    ["rankings", "Power rankings"],
    ["luck", "Luck"],
    ["lineups", "Lineups"],
    ["head-to-head", "Head-to-head"],
    ["scoring", "Scoring"],
    ["draft", "Draft & moves"],
    ["managers", "Managers"],
    ["playoffs", "Playoffs"],
    ["records", "Records"],
    ["limits", "Not possible"],
  ] as const

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Toolbar>
        <ScopeToggle value={scope} options={scopes} onChange={setScope} />
        <HighlightPicker managers={everyone} value={highlighted} onChange={setHighlighted} end />
      </Toolbar>
      <div className="grid max-w-prose gap-2 text-sm">
        <p>
          Everything the statistics pages get from ESPN&apos;s own data (rosters, lineups, projections, the draft and transactions), gathered in one place.
          Each part also appears on its own tab; the links go there.
        </p>
        <nav aria-label="Jump to a tab's additions" className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          {groups.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="underline-offset-2 hover:text-foreground hover:underline">
              {label}
            </a>
          ))}
        </nav>
      </div>

      <Group id="season" tab="Season" href={`/statistics?season=${year}`} note={scope === "all" ? `Season additions are one season's, so this is ${year}.` : undefined}>
        <Section title="Week by week">
          <SeasonAdditions honours={season.honours[year] ?? []} highlighted={highlighted} />
        </Section>
      </Group>
      <Group id="outlook" tab="Outlook" href="/statistics/outlook" note={`${unscoped} It covers the season under way.`}>
        <OutlookAdditions data={outlook} highlighted={highlighted} />
        {!outlook.thisWeek && !outlook.restOfSeason && !outlook.byes && <p className="text-muted-foreground text-sm">Every week of this season is done.</p>}
      </Group>
      <Group id="rankings" tab="Power rankings" href="/statistics/rankings" note={unscoped}>
        <RankingsAdditions data={rankings} highlighted={highlighted} />
      </Group>
      <Group id="luck" tab="Luck" href={`/statistics/luck?season=${scope}`}>
        <LuckAdditions data={luck[key]} scope={scope} highlighted={highlighted} />
      </Group>
      <Group id="lineups" tab="Lineups" href={`/statistics/lineups?season=${scope}`} note="The whole tab is new.">
        <LineupsSections data={lineups[key]} scope={scope} highlighted={highlighted} />
      </Group>
      <Group id="head-to-head" tab="Head-to-head" href="/statistics/head-to-head" note={`${unscoped} On the tab, the rivalry follows the one picked there.`}>
        <H2HAdditions data={h2h} highlighted={highlighted} />
      </Group>
      <Group id="scoring" tab="Scoring" href={`/statistics/scoring?season=${scope}`}>
        <ScoringAdditions data={scoring[key]} scope={scope} highlighted={highlighted} />
      </Group>
      <Group id="draft" tab="Draft & moves" href={`/statistics/draft?season=${scope}`} note="The whole tab is new.">
        <DraftMovesSections data={draft} scope={scope} highlighted={highlighted} />
      </Group>
      <Group id="managers" tab="Managers" href={`/statistics/managers/${encodeURIComponent(manager)}`} note={`${unscoped} On the site it's on each manager's own page.`}>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Manager</span>
          <Picker label="Manager to show" size="sm" options={everyone} value={manager} onChange={setPicked} />
        </div>
        <ManagerAdditions manager={manager} data={managers[manager]} />
      </Group>
      <Group id="playoffs" tab="Playoffs" href="/statistics/playoffs" note={unscoped}>
        <PlayoffsAdditions data={playoffs} highlighted={highlighted} />
      </Group>
      <Group id="records" tab="Records" href="/statistics/records" note={unscoped}>
        <RecordsAdditions data={records} highlighted={highlighted} />
      </Group>

      <div id="limits" className="grid scroll-mt-28 grid-cols-[minmax(0,1fr)] gap-6 border-t pt-6">
        <Section title="Not possible" description={`Next steps ESPN's data can't support. The ${scopeLabel(scope)} choice doesn't apply.`}>
          <Panel title="Not possible with ESPN's data" description="And why.">
            <ul className="grid gap-2 text-sm">
              {IMPOSSIBLE.map(([name, why]) => (
                <li key={name}>
                  <span className="font-medium">{name}</span>: {why}
                </li>
              ))}
            </ul>
          </Panel>
        </Section>
      </div>
    </div>
  )
}
