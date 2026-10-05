export type TeamKey =
  | 'Whieldon' | 'Robert' | 'Andy' | 'Logan' | 'Max' | 'Ethan'
  | 'James' | 'Matt' | 'Dillon' | 'Landon' | 'Brady' | 'Andrew'

export const TEAMS: Record<TeamKey, { alias: string, logoPath: string }> = {
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

export type Ranking = { team: TeamKey, rank: number, record: string, description: string }
export type PowerRankingWeek = { week: number, rankings: Ranking[] }
export type PowerRankInfo = { name: string, alias: string, newRank: number, oldRank?: number, record: string, logoPath: string, description: string }

export const POWER_RANKINGS: PowerRankingWeek[] = [
  {
    week: 3,
    // TODO: records are "0-0" placeholders, replace with the real week 3 records
    rankings: [
      { team: "Whieldon", rank: 8,  record: "1-2", description: "How the mighty have fallen" },
      { team: "Robert",   rank: 9,  record: "1-2", description: "Has he lost the magic?" },
      { team: "Andy",     rank: 5,  record: "2-1", description: "115 points or nothing" },
      { team: "Logan",    rank: 1,  record: "3-0", description: "The clear favorite" },
      { team: "Max",      rank: 2,  record: "2-1", description: "Strongest player in the strongest division" },
      { team: "Ethan",    rank: 12, record: "1-2", description: "Weakest player in the weakest division" },
      { team: "James",    rank: 11, record: "0-3", description: "Only here because Ethan's worse" },
      { team: "Matt",     rank: 4,  record: "2-1", description: "Bouncing back strong from last season" },
      { team: "Dillon",   rank: 10, record: "0-3", description: "Going back to whence he came" },
      { team: "Landon",   rank: 7,  record: "2-1", description: "Volatility personified" },
      { team: "Brady",    rank: 3,  record: "3-0", description: "Reeking of fraudulence, but still undefeated" },
      { team: "Andrew",   rank: 6,  record: "1-2", description: "Bugatti in trailer park" },
    ],
  },
]

// Joins team info and the previous week's rank (if any), sorted by rank
export function getRankings(weeks: PowerRankingWeek[], week: number): PowerRankInfo[] {
  const current = weeks.find((w) => w.week === week)
  const previous = weeks.find((w) => w.week === week - 1)
  if (!current) return []

  return current.rankings
    .map(({ team, rank, record, description }) => ({
      name: team,
      ...TEAMS[team],
      newRank: rank,
      oldRank: previous?.rankings.find((r) => r.team === team)?.rank,
      record,
      description,
    }))
    .toSorted((a, b) => a.newRank - b.newRank)
}
