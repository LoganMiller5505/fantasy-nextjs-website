import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { cn } from "cn"
import { isEditor } from "@/lib/editor"
import { getPowerRankingWeeks } from "@/lib/power-rankings"
import { editorLogout } from "../../editor/actions"
import { WriteupForm } from "./writeup-form"

export const metadata: Metadata = { title: "Edit power rankings" }

export default async function EditPowerRankingsPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await connection()
  const { week } = await searchParams
  if (!(await isEditor())) {
    const here = `/power-rankings/edit${week ? `?week=${encodeURIComponent(week)}` : ""}`
    redirect(`/editor?from=${encodeURIComponent(here)}`)
  }

  const weeks = await getPowerRankingWeeks({ unwritten: true })
  const selected = weeks.find((w) => String(w.week) === week) ?? weeks.at(-1)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Edit power rankings</h1>
        <p className="text-muted-foreground">
          Ranks and records come from the sheet&apos;s ballots and scores. Write-ups show on the home page once a week has at least one.
        </p>
      </div>

      {selected ? (
        <>
          <nav aria-label="Week" className="flex flex-wrap gap-2">
            {weeks.toReversed().map((w) => (
              <Link
                key={w.week}
                href={`?week=${w.week}`}
                aria-current={w === selected ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted",
                  w === selected && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                Week {w.week}
                {!w.written && <span className={cn(w !== selected && "text-muted-foreground")}> · not written</span>}
              </Link>
            ))}
          </nav>
          <WriteupForm key={`${selected.year}-${selected.week}`} week={selected} />
        </>
      ) : (
        <p className="text-muted-foreground">No ballots in the sheet yet this season.</p>
      )}

      <form action={editorLogout} className="text-center text-sm text-muted-foreground">
        <button type="submit" className="hover:text-foreground hover:underline">Log out of editing</button>
      </form>
    </div>
  )
}
