"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { DataTable } from "../../data-table"
import { SortableHeader, sortFn_numeric } from "../../columns"
import { type DataTableFeatures } from "../../data-table-features"
import type { BracketGame, ResumeRow, seedTable } from "../playoffs"
import { Panel, SimpleTable, fmt } from "../ui"

const columnHelper = createColumnHelper<DataTableFeatures, ResumeRow>()
const keys = ["Seasons", "Apps", "Titles", "Finals", "Podiums", "Bracket W-L", "Win%", "Byes", "Avg seed", "Best"] as const
const textKeys = new Set<string>(["Bracket W-L", "Best"])

const columns = columnHelper.columns([
  columnHelper.accessor("player", {
    header: ({ column }) => <SortableHeader column={column} title="Player" />,
    enableHiding: false,
    filterFn: "excludes",
  }),
  ...keys.map((key) =>
    columnHelper.accessor(key, {
      header: ({ column }) => <SortableHeader column={column} title={key} />,
      ...(!textKeys.has(key) && { sortFn: sortFn_numeric }),
      ...(key === "Win%" && {
        cell: ({ row, getValue }) => (row.original["Bracket W-L"] === "0-0" ? "—" : Number(getValue()).toFixed(3)),
      }),
      ...(key === "Avg seed" && { cell: ({ getValue }) => (getValue() == null ? "—" : Number(getValue()).toFixed(1)) }),
    })
  ),
])

export function PlayoffResumes({ rows }: { rows: ResumeRow[] }) {
  return (
    <Panel
      title="Playoff résumés"
      description="Finished seasons only. Apps are championship-bracket appearances; podiums are top-three finishes. Bracket W-L leaves out 3rd-place and consolation games. Byes are first-round byes."
    >
      <DataTable columns={columns} data={rows} />
    </Panel>
  )
}

export function SeedsAndUpsets({ seeds, years, upsets }: { seeds: ReturnType<typeof seedTable>; years: number[]; upsets: BracketGame[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
