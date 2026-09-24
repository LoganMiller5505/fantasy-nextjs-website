import { sql } from '@/lib/db'
import { Video } from './components/video'

export default async function Page() {
  const players = await sql`SELECT id, column_1 FROM test LIMIT 10`
  return (
    <div className="space-y-8">
      <Video id="1229757405" title="Haters Guide" />
      <ul>{players.map((p) => <li key={p.id}>{p.column_1}</li>)}</ul>
    </div>
  )
}
