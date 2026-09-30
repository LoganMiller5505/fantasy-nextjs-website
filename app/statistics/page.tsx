import { sql } from "@/lib/db"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { columns, headToHeadColumns, initialColumnVisibility, AllTime } from "./columns"
import { matchupColumns2024, matchupColumns2025, matchupColumns2026, type MatchupRow } from "./matchup-columns"
import { DataTable } from "./data-table"

// Every table starts with the best record at the top
const byWinPct = [{ id: "Win%", desc: true }]

export default async function DemoPage() {
  const [data, matchups2026, matchups2025, matchups2024] = (await Promise.all([
    sql`SELECT * FROM source.all_time`,
    sql`SELECT * FROM source.matchups_2026`,
    sql`SELECT * FROM source.matchups_2025`,
    sql`SELECT * FROM source.matchups_2024`,
  ])) as [AllTime[], MatchupRow[], MatchupRow[], MatchupRow[]]

  return (
    <div className="container mx-auto">
      <Tabs defaultValue="all-time">
        <TabsList>
          <TabsTrigger value="all-time">All-Time</TabsTrigger>
          <TabsTrigger value="2026">2026</TabsTrigger>
          <TabsTrigger value="2025">2025</TabsTrigger>
          <TabsTrigger value="2024">2024</TabsTrigger>
        </TabsList>
        <TabsContent value="all-time">
          <DataTable
            columns={columns}
            data={data}
            initialColumnVisibility={initialColumnVisibility}
            initialSorting={byWinPct}
            quickToggle={{ label: "head-to-head", columns: headToHeadColumns }}
          />
        </TabsContent>
        <TabsContent value="2026">
          <DataTable columns={matchupColumns2026} data={matchups2026} initialSorting={byWinPct} />
        </TabsContent>
        <TabsContent value="2025">
          <DataTable columns={matchupColumns2025} data={matchups2025} initialSorting={byWinPct} />
        </TabsContent>
        <TabsContent value="2024">
          <DataTable columns={matchupColumns2024} data={matchups2024} initialSorting={byWinPct} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
