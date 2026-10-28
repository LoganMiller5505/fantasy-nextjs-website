import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getStats } from "../../_lib/data"
import { managerProfiles } from "../../_lib/managers"
import { careers, winPctByWeek, type Scope } from "../../_lib/stats"
import { ManagerPage } from "../../_sections/managers"

// One page per manager who has ever played, built ahead of time
export async function generateStaticParams() {
  const { league } = await getStats()
  return [...new Set(league.teams.map((t) => t.manager))].map((manager) => ({ manager }))
}

export async function generateMetadata(props: { params: Promise<{ manager: string }> }): Promise<Metadata> {
  const { manager } = await props.params
  return { title: `${decodeURIComponent(manager)} · Statistics` }
}

export default async function Manager(props: { params: Promise<{ manager: string }> }) {
  const manager = decodeURIComponent((await props.params).manager)
  const { league, sides, results, seasons } = await getStats()
  const profiles = managerProfiles(league, sides, results)
  if (!profiles[manager]) notFound()
  const scopes: Scope[] = ["all", ...seasons]

  return (
    <ManagerPage
      profile={profiles[manager]}
      careers={careers(league, sides, results)}
      scopes={scopes}
      byWeek={Object.fromEntries(scopes.map((s) => [s, winPctByWeek(league, sides, s)]))}
    />
  )
}
