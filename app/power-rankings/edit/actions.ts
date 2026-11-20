"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import { isEditor } from "@/lib/editor"

const MAX_TEXT = 2000
const AUTHORS = ["Logan", "Andy", "Both"] as const

export type SaveState = { error?: string; savedAt?: number }

// Saves one week's write-ups. The form names each box "<author>|<manager>"; a box left empty
// deletes that write-up. Boxes not in the form are left alone.
export async function saveWriteups(_prev: SaveState, formData: FormData): Promise<SaveState> {
  if (!(await isEditor())) return { error: "You're not logged in as an editor." }

  const year = Number(formData.get("year"))
  const week = Number(formData.get("week"))
  if (!Number.isInteger(year) || !Number.isInteger(week)) return { error: "That week doesn't exist." }

  // Only managers on that week's ballots can be written up
  const managers = (await sql`
    select distinct m.name from league.power_ranking p join league.manager m using (manager_id)
    where p.year = ${year} and p.week_no = ${week}
  `).map((r) => r.name as string)
  if (managers.length === 0) return { error: "That week has no ballots in the sheet." }

  const writes = []
  for (const manager of managers) {
    for (const author of AUTHORS) {
      const raw = formData.get(`${author}|${manager}`)
      if (raw === null) continue
      const text = String(raw).trim()
      if (text.length > MAX_TEXT) return { error: `${author === "Both" ? "The" : `${author}'s`} write-up for ${manager} is over ${MAX_TEXT} characters.` }
      writes.push(text
        ? sql`
            insert into content.power_ranking_writeup (year, week_no, manager_id, author, text)
            select ${year}, ${week}, manager_id, ${author}, ${text} from league.manager where name = ${manager}
            on conflict (year, week_no, manager_id, author) do update set text = excluded.text`
        : sql`
            delete from content.power_ranking_writeup
            where year = ${year} and week_no = ${week} and author = ${author}
              and manager_id = (select manager_id from league.manager where name = ${manager})`)
    }
  }
  if (writes.length > 0) await sql.transaction(writes)

  revalidatePath("/")
  revalidatePath("/power-rankings/edit")
  return { savedAt: Date.now() }
}
