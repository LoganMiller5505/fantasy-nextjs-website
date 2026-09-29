import { sql } from "@/lib/db"
import { columns, initialColumnVisibility, AllTime } from "./columns"
import { DataTable } from "./data-table"

async function getData(): Promise<AllTime[]> {
  return (await sql`SELECT * FROM source.all_time`) as AllTime[]
}

export default async function DemoPage() {
  const data = await getData()

  return (
    <div className="container mx-auto">
      <DataTable
        columns={columns}
        data={data}
        initialColumnVisibility={initialColumnVisibility}
      />
    </div>
  )
}
