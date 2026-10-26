"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { DataTable } from "../_components/data-table"
import { SortableHeader, numeric } from "../_components/table-helpers"
import { type DataTableFeatures } from "../_components/data-table-features"
import type { BracketGame, ResumeRow, seedTable } from "../_lib/playoffs"
import { ManagerLink, Panel, SimpleTable, fmt, pctFmt } from "../_components/ui"

const columnHelper = createColumnHelper<DataTableFeatures, ResumeRow>()
const keys = ["Seasons", "Apps", "Titles", "Finals", "Podiums", "Bracket W-L", "Win%", "Byes", "Avg seed", "Best"] as const
const textKeys = new Set<string>(["Bracket W-L", "Best"])

const columns = columnHelper.columns([
  columnHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Manager" />,
    enableHiding: false,
    filterFn: "excludes",
    cell: ({ getValue }) => <ManagerLink manager={String(getValue())} />,
  }),
  ...keys.map((key) =>
    columnHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...(!textKeys.has(key) && numeric),
      // A lower average seed is better, so it sorts lowest first
      ...(key === "Avg seed" && { sortDescFirst: false }),
      ...(key === "Win%" && {
        cell: ({ row, getValue }) => (row.original["Bracket W-L"] === "0-0" ? "—" : pctFmt(Number(getValue()))),
      }),
      ...(key === "Avg seed" && { cell: ({ getValue }) => (getValue() == null ? "—" : Number(getValue()).toFixed(1)) }),
    })
  ),
])

export function PlayoffResumes({ rows, highlighted }: { rows: ResumeRow[]; highlighted: string | null }) {
  return (
    <Panel
      title="Playoff résumés"
      description="Each manager's record once the regular season is over."
      method="Finished seasons only. Apps are championship-bracket appearances; podiums are top-three finishes. Bracket W-L leaves out 3rd-place and consolation games. Byes are first-round byes. Seasons, Podiums and Byes start hidden; add them back with Columns."
    >
      <DataTable columns={columns} data={rows} initialColumnVisibility={{ Seasons: false, Podiums: false, Byes: false }} highlight={(r) => r.player === highlighted} />
    </Panel>
  )
}

export function SeedsAndUpsets({ seeds, years, upsets }: { seeds: ReturnType<typeof seedTable>; years: number[]; upsets: BracketGame[] }) {
  return (
    <div className="grid gap-4">
      <Panel title="Seed by season" description="Who held each playoff seed and how far they went.">
        <SimpleTable
          head={["Seed", ...years.map(String), "Bracket W-L", "Titles"]}
          align={["right", ...years.map(() => "left" as const), "right", "right"]}
          rows={seeds.map((s) => [
            s.seed,
            ...years.map((y) => {
              const f = s.bySeason[y]
              return f ? (
                <span key={y}>
                  {f.manager} <span className="text-muted-foreground">· {f.label.replace("Out in ", "out, ").replace("Playoff ", "")}</span>
                </span>
              ) : (
                <span key={y} className="text-muted-foreground">—</span>
              )
            }),
            s.record,
            s.titles,
          ])}
        />
      </Panel>
      <Panel title="Upsets" description="Bracket games won by the lower seed. Double-week rounds count both weeks' points.">
        {upsets.length ? (
          <SimpleTable
            head={["Season", "Round", "Winner", "Loser", "Score"]}
            align={["left", "left", "left", "left", "right"]}
            rows={upsets.map((g) => [
              g.year,
              g.round.replace("Playoff ", ""),
              `${g.winner} (${g.winnerSeed})`,
              `${g.loser} (${g.loserSeed})`,
              `${fmt(g.winnerPf)} – ${fmt(g.loserPf)}`,
            ])}
          />
        ) : (
          <p className="text-muted-foreground text-sm">No upsets yet: the higher seed has won every bracket game.</p>
        )}
      </Panel>
    </div>
  )
}
