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

type RankingBase = { team: TeamKey, rank: number, record: string }
export type Author = 'logan' | 'andy'
export type Ranking = RankingBase & (
  | { description: string }
  | { loganDescription: string, andyDescription: string }
)
export type PowerRankingWeek = { week: number, rankings: Ranking[] }
export type PowerRankInfo = { name: string, alias: string, newRank: number, oldRank?: number, record: string, logoPath: string, description?: string, loganDescription?: string, andyDescription?: string }

export const POWER_RANKINGS: PowerRankingWeek[] = [
  {
    week: 3,
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
  {
    week: 4,
    rankings: [
      { team: "Whieldon", rank: 8,  record: "2-2",  loganDescription: "It's tough to pin down what exactly is going on with Whieldon's team. So far, it's been a coin flip whether he scores 130+ or is stuck in the double digits. Consistency will be key moving forward.",
                                                    andyDescription: "Theoretically, Whieldon's team should be much better than it has been so far. At least the roster finally had a complete game from every position this week." },
      { team: "Robert",   rank: 9,  record: "1-3",  loganDescription: "Has he lost his magic touch? Maybe it's just the fact that untimely injuries and unfortunate player matchups have kept his score down. But ever since that week 1 one-point loss, nothing has been able to dull the unease surrounding his team.", 
                                                    andyDescription: "It's time to admit Robert just has a bad team, hampered by poor running backs and let down by his wide receivers, excluding CeeDee. The schedule has been tough, but it's only getting tougher. He has Max next on the docket and doesn't play a team under .500 until Week 9." },
      { team: "Andy",     rank: 6,  record: "2-2",  loganDescription: "His team isn't bad, but he's the biggest victim of a shockingly competitive North division. It'll be tough for him to string together wins when he has to play some truly good teams twice each.",
                                                    andyDescription: "Worst case scenario for this week, everyone else in the division won. At least I scored more than 115 points? Is relying on the Vikings defense and kicker for points sustainable?" },
      { team: "Logan",    rank: 2,  record: "3-1",  loganDescription: "Despite my horrendous and embarassing week 4 loss, I still have confidence in the top talent on my roster. I should be able to capitalize on a weak East division to make a strong push for the playoffs.",
                                                    andyDescription: "Despite losing a trap game, his team is still too talented to fail. The rest of the competition in the division losing cushions the loss." },
      { team: "Max",      rank: 1,  record: "3-1",  loganDescription: "Even when Max lost, he still scored the third most points that week. If he stays as consistently strong as he has been so far, you'd be hard-pressed to predict many more losses for him.", 
                                                    andyDescription: "Max has scored 130+ points in his last three games and looks like a juggernaut. The bench has been putting up points too. In a stacked division, he's come out on top." },
      { team: "Ethan",    rank: 10,  record: "2-2", loganDescription: "Quite possibly the weakest .500 team of all time, his RB injuries are immensely concerning. Strong performances from \"breakout candidate\"-type players have been the only thing keeping him afloat. That, and some very favorable opponent scheduling.", 
                                                    andyDescription: "Is this the worst 2-2 team of all time? He didn't break 85 points until this week. However if Tet, London, and Penix keep up this level of play he could potentially have something." },
      { team: "James",    rank: 12,  record: "1-3", loganDescription: "Even a win against the division leader can't help dull the pain of having to run the hospital that is his roster. It'd be tough for anyone to bounce back from this, and it's really looking like he's following the 2025 Matt trajectory.",
                                                    andyDescription: "While the win over Logan was an exciting win, it was purely a pyrrhic victory. More starters fell to the sword, and literally his entire bench is hurt. He could field a starting caliber team with his hospital patients. What was the price he paid for the 2025 Championship victory??" },
      { team: "Matt",     rank: 7,  record: "2-2",  loganDescription: "On paper, the roster is fine, but he has yet to prove that he can win a high-scoring affair. If all his players start performing at the same time, watch out, but otherwise, you can expect a pretty middling score with only a couple players setting the tone.",
                                                    andyDescription: "The back half of Matt's roster has been disappointing. Outside of Gibbs, it feels like he's lacked any true difference makers so far." },
      { team: "Dillon",   rank: 11,  record: "0-4", loganDescription: "Dillon always seems to bench the guys who breakout and start the ones who struggle. While most of these choices can be justified independently, he just can't seem to string anything positive together.",
                                                    andyDescription: "No team in league history has ever made the playoffs starting 0-4. If you're looking for a get-right game, too bad you're playing 3-1 Logan. Better figure out how this roster is going to win games now before you play in the Loser's Bracket. THE CHIP is beckoning." },
      { team: "Landon",   rank: 3, record: "3-1",   loganDescription: "He had an ugly loss one week, but that clearly has not defined this roster. He has a strong team, and you can expect a great competition between him and Max for the division.",
                                                    andyDescription: "Landon eked out a close win against a division rival to advance to 3-1. The 53 point game looks like it was an aberration, but the inconsistency of his WR2 slot is anything but." },
      { team: "Brady",    rank: 4, record: "3-1",   loganDescription: "If you can avert your eyes from Brady's bench, you can talk yourself into his continued success. Even with that consideration, he can't drop far in the rankings after a quality loss to the newly minted first-place Max.",
                                                    andyDescription: "Brady lost a close game that potentially could have been won if not for injuries. The rolling byes could be killer these next few weeks with how thin and lackluster his bench is." },
      { team: "Andrew",   rank: 5, record: "2-2",   loganDescription: "Even without Josh Allen and JSN playing their signature hero ball this week, Andrew's team once again put up a top 3 in the league score. His bench has looked strong, too, in large part due to smart waiver wire pickups. He has a true shot to contend, even at 2-2.",
                                                    andyDescription: "Andrew's quietly put up 130+ in three of his first four games of the season. Decimating Robert was critical to keep up with the Jones's of the division, and he did it without big performances from Josh Allen or JSN. The depth pieces are showing out." },
    ],
  }
]

// Joins team info and the previous week's rank (if any), sorted by rank
export function getRankings(weeks: PowerRankingWeek[], week: number): PowerRankInfo[] {
  const current = weeks.find((w) => w.week === week)
  const previous = weeks.find((w) => w.week === week - 1)
  if (!current) return []

  return current.rankings
    .map(({ team, rank, record, ...descriptions }) => ({
      name: team,
      ...TEAMS[team],
      newRank: rank,
      oldRank: previous?.rankings.find((r) => r.team === team)?.rank,
      record,
      ...descriptions,
    }))
    .toSorted((a, b) => a.newRank - b.newRank)
}
