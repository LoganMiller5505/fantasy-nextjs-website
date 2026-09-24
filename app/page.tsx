import { sql } from '@/lib/db'

export default async function Page() {
  const players = await sql`SELECT id, column_1 FROM test LIMIT 10`
  return <ul>{players.map((p) => <li key={p.id}>{p.column_1}</li>)}</ul>
}