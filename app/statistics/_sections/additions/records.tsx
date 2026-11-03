"use client"

import { Panel, Section, SimpleTable, StatTile, fmt } from "../../_components/ui"
import type { RecordsAdditionsData } from "../../_lib/espn/additions"
import type { RecordTile } from "../../_lib/espn/records"

function Tiles({ tiles }: { tiles: RecordTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <StatTile key={t.label} {...t} />
      ))}
    </div>
  )
}

// Records only ESPN's data can set, and the league's own rules season by season
export function RecordsAdditions({ data, highlighted }: { data: RecordsAdditionsData; highlighted: string | null }) {
  const { games, seasons, settings } = data
  return (
    <>
      <Section title="Players and lineups" description="All-time, from ESPN's lineups. Lineup records are regular season; player games count every week.">
        <Tiles tiles={games.tiles} />
        <Panel title="Top 10 player games" description="The best single weeks by a starter, playoffs included.">
          <SimpleTable
            head={["Week", "Manager", "Player", "Pts", "Projected"]}
            align={["left", "left", "left", "right", "right"]}
            highlight={(i) => games.games[i].manager === highlighted}
            rows={games.games.map((g) => [`${g.year} ${g.week}`, g.manager, `${g.name} (${g.position})`, fmt(g.points, 1), g.projected == null ? "—" : fmt(g.projected, 1)])}
          />
        </Panel>
      </Section>
      <Section title="Drafts, moves and lineup seasons" description="All-time, by the measures on the Lineups and Draft & moves tabs.">
        <Tiles tiles={seasons} />
      </Section>
      <Section title="League settings" description="The league's rules each season, as ESPN has them.">
        <Panel title="Settings by season">
          <SimpleTable
            head={["Setting", ...settings.years.map(String)]}
            align={["left", ...settings.years.map(() => "right" as const)]}
            rows={settings.rows.map((r) => [r.label, ...r.values])}
          />
        </Panel>
        {settings.changes.length > 0 && (
          <Panel title="Scoring changes" description="Every scoring rule whose points have changed between seasons.">
            <SimpleTable
              head={["Stat", ...settings.years.map(String)]}
              align={["left", ...settings.years.map(() => "right" as const)]}
              rows={settings.changes.map((c) => [c.stat, ...c.values.map((v) => (v == null ? "—" : String(v)))])}
            />
          </Panel>
        )}
      </Section>
    </>
  )
}
