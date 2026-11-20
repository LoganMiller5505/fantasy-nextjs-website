import "server-only"
import { sql } from "@/lib/db"
import { getLeague } from "@/lib/league"
import { consensusRanks, latestYear, managersIn, playedSides, record } from "@/app/statistics/_lib/stats"

// Weekly power rankings. The ranks and records come from the sheet (league.power_ranking ballots,
// league.game); the write-ups are written on the site at /power-rankings/edit and live in
// content.power_ranking_writeup.

// Team names and logos for the current season, keyed by manager
const TEAMS: Record<string, { alias: string, logoPath: string }> = {
  Whieldon: { alias: "Naberhood Creep",                 logoPath: "/logos/Whieldon.svg" },
  Robert:   { alias: "Come Cee Whats in my Basement",   logoPath: "/logos/Robert.jpg" },
  Andy:     { alias: "Fortuitous Bust",                 logoPath: "/logos/Andy.jpg" },
  Logan:    { alias: "Sleepy Joe Flacco",               logoPath: "/logos/Logan.jpg" },
  Max:      { alias: "Omani Rials",                     logoPath: "/logos/Max.svg" },
  Ethan:    { alias: "Gay butt stuff",                  logoPath: "/logos/Ethan.svg" },
  James:    { alias: "Dont kirk off your cousins",      logoPath: "/logos/James.jpg" },
  Matt:     { alias: "Robert molester",                 logoPath: "/logos/Matt.svg" },
  Dillon:   { alias: "Big Intelligent Group Dominance", logoPath: "/logos/Dillon.svg" },
  Landon:   { alias: "Nacua Matata",                    logoPath: "/logos/Landon.png" },
  Brady:    { alias: "CRashee and Dart",                logoPath: "/logos/Brady.svg" },
  Andrew:   { alias: "Inside Zone x3 Aww Punts",        logoPath: "/logos/Andrew.jpg" },
}

export type Author = 'logan' | 'andy'
export type PowerRankInfo = {
  name: string, alias: string, logoPath: string, newRank: number, oldRank?: number, record: string,
  description?: string, loganDescription?: string, andyDescription?: string,
}
// One ballot week, teams in rank order. `written` is whether anyone has written it up yet.
export type PowerRankingWeek = { year: number, week: number, written: boolean, rankings: PowerRankInfo[] }

type Writeup = { week_no: number, manager: string, author: 'Logan' | 'Andy' | 'Both', text: string }

// Every ballot week of the latest season, oldest first. Viewers only get weeks that have been
// written up, so a new ballot from the sheet doesn't appear as a blank week; the editor gets all.
export async function getPowerRankingWeeks({ unwritten = false } = {}): Promise<PowerRankingWeek[]> {
  const league = await getLeague()
  const year = latestYear(league)
  const writeups = (await sql`
    select w.week_no::int, m.name as manager, w.author, w.text
    from content.power_ranking_writeup w join league.manager m using (manager_id)
    where w.year = ${year}
  `) as Writeup[]

  const ballots = league.powerRankings.filter((p) => p.year === year)
  const weeks = [...new Set(ballots.map((b) => b.week_no))].sort((a, b) => a - b)
  const managers = managersIn(league, year)
  const sides = playedSides(league).filter((s) => s.year === year && !s.playoff)

  const all = weeks.map((week, i) => {
    const ranks = consensusRanks(ballots, managers, week)
    const previous = i > 0 ? consensusRanks(ballots, managers, weeks[i - 1]) : null
    const mine = writeups.filter((w) => w.week_no === week)
    const text = (m: string, author: Writeup['author']) => mine.find((w) => w.manager === m && w.author === author)?.text
    const rankings = managers
      .map((m) => {
        const played = sides.filter((s) => s.manager === m && s.week_no <= week)
        const wins = played.filter((s) => s.win).length
        return {
          name: m,
          alias: TEAMS[m]?.alias ?? m,
          logoPath: TEAMS[m]?.logoPath ?? "",
          newRank: ranks[m],
          oldRank: previous?.[m],
          record: record(wins, played.length - wins),
          description: text(m, 'Both'),
          loganDescription: text(m, 'Logan'),
          andyDescription: text(m, 'Andy'),
        }
      })
      .sort((a, b) => a.newRank - b.newRank)
    return { year, week, written: mine.length > 0, rankings }
  })
  return unwritten ? all : all.filter((w) => w.written)
}
