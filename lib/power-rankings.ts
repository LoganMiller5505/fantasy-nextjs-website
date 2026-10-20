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
  },
  {
    week: 5,
    rankings: [
      { team: "Whieldon", rank: 6,  record: "3-2",  loganDescription: "After an up and down start, Whieldon's finally gotten two wins in a row. If he keeps up this potential newfound consistency, it's hard to see anyone challenging him for the division in the next several weeks.",
                                                    andyDescription:  "Whieldon's team has seemingly finally woken up these last couple weeks. He's rebounded nicely after a skid and has been able to slingshot himself back into first in the division." },
      { team: "Robert",   rank: 9,  record: "1-4",  loganDescription: "A down week for Dak and CeeDee was a death sentence for Robert's team. He has real contributors in Garrett Wilson and Tyler Warren, but outside of that, there's really nothing to build on. Better hit the waiver wire for some RB4s elevated by injuries, bud. That might be your only chance.",
                                                    andyDescription:  "Robert lost yet another winnable game due to poor play by his running backs. Omarion Hampton in particular has been brutal, and may be the biggest bust of the draft in terms of output unrelated to injury. If he can't beat a struggling Matt team that has been his perpetual property next week, he might have to start preparing for a trip to the Loser's Bracket for the first time." },
      { team: "Andy",     rank: 7,  record: "3-2",  loganDescription: "Once again, Andy scores around 115 and gets a win, but he's still in the basement of the division. Just ask Mike Tomlin: \"The Standard\" just won't be enough to contend in the North. I'd start building up that Minecraft city to help pass the time until you inevitably win the loser's bracket again.",
                                                    andyDescription:  "The litmus test of teams. No matter what the projections look like, 115 points will be scored. Unfortunately, it's not enough to compete in the insanely competitive North." },
      { team: "Logan",    rank: 3,  record: "3-2",  loganDescription: "I'm not hitting the panic button yet, but I'm getting dangerously close to catching some \"potential team\" and \"if man\" allegations here. Thankfully, the East is so weak that I'm still leading the division, and at least there's no more zero win teams left to lose to.",
                                                    andyDescription:  "Despite losing a trap game, his team is still too talented to fail. The rest of the competition in the division losing cushions the loss. Huh that felt familiar... I guess Logan just loves giving winless teams a helping hand. If the East wasn't so pathetic there'd be more concern." },
      { team: "Max",      rank: 1,  record: "4-1",  loganDescription: "Max lost the lead in his division due to Landon's historic performance as well as a relatively poor game by his standards, but the consistency of his team is not in question. Just look forward to the absolute cinema matchups between him and Landon.",
                                                    andyDescription:  "Max had a bit of a down week, but it was still enough to beat a hated rival and advance to 4-1. His body of work has earned him this reprieve." },
      { team: "Ethan",    rank: 11,  record: "2-3", loganDescription: "Penix going out means that Ethan only has Justin Herbert rostered at QB and that his WR1, Drake London, now depends on Tua's meatball subs. The outlook is dire, and he's a front-runner for Toilet Bowl contention.",
                                                    andyDescription:  "Ethan's team is underwhelming across the board. If Michael Penix is out for a while, it'll hurt both his QB position and Drake London's upside." },
      { team: "James",    rank: 12,  record: "1-4", loganDescription: "Three words: injuries, injuries, injuries. It's the story of James' season so far, and even Jayden Daniels returning wasn't enough to make him competitive. He'll need to play the long game and hope the healing light of heaven shines down on his roster before the playoffs begin, or he's in trouble.",
                                                    andyDescription:  "James legitimately had to start Jets RB Isaiah Davis this week. I don't even know who that is. There's nothing he can really do until his team gets healthier." },
      { team: "Matt",     rank: 8,  record: "2-3",  loganDescription: "Being on the receiving end of a league-high score isn't fun, and neither is putting up sub-100 points two weeks in a row. His standing improves significantly if he can handle business against Robert, but with Max, Brady, and Andy looming in the weeks following, it's hard to see a high ceiling for his team.",
                                                    andyDescription:  "In fairness, Matt never stood a chance against the performances of his last two opponents, but he hasn't looked good in the losses either. It hurts that he's been unable to capitalize on Logan tripping over himself." },
      { team: "Dillon",   rank: 10,  record: "1-4", loganDescription: "A complete team win? From DILLON? I never thought I'd see the day. Now it's up to him to prove this performance is the new normal rather than just a lucky break. At 1-4, though, it's tough to see a true turnaround happening, even if the play improves.",
                                                    andyDescription:  "Look who finally decided to show up. If he can keep up this production, maybe he could dig himself out of the 0-4 hole he put himself in. It's probably too little too late." },
      { team: "Landon",   rank: 2, record: "4-1",   loganDescription: "A record-setting win this week proves the kind of team he has. The low score three weeks ago was clearly a fluke, and Landon is securely in contender status. Quite the impressive turnaround from last year.",
                                                    andyDescription:  "Landon had a performance that only happens once a year, and how sweet it was that he could get revenge against Matt for last year's playoffs. He and Max are the best teams in the league, and their showdowns Weeks 9 and 14 will be must-see." },
      { team: "Brady",    rank: 5, record: "3-2",   loganDescription: "An ugly loss that came with a staggering amount of injuries. The record is good, but the roster is looking rough as ever. With bye weeks beginning to hit, I don't see him keeping up his early season success for much longer.",
                                                    andyDescription:  "The injuries are piling up and the lack of depth is rearing its ugly head. Brady's lost grip of the South, too." },
      { team: "Andrew",   rank: 4, record: "3-2",   loganDescription: "Andrew quietly leads the league in points scored, and he's made it clear he can string together wins with different players contributing each week. The North is brutal this year, but Andrew is primed to sneak into the mix for division title.",
                                                    andyDescription:  "Sleep on him if you dare. Andrew is the only team to have broken 700 Points For this year, and the points are coming from more than Josh Allen and JSN. Every week he has someone new going for 20+, and it covers the flaws of those with a down game." },
    ]
  },
  {
    week: 6,
    rankings: [
      { team: "Andrew", rank: 1, record: "4-2",   loganDescription: "Andrew proved he can win the big games with a massive win over Max to take the division. With the most points for and an incredibly soft schedule in his future, Andrew will look to pull his record ahead of the crowd in the North so he can have a stress free couple of weeks before the playoffs.",
                                                  andyDescription: "Andrew's regained control of the division by completing the season sweep on Max. Isaiah Likely and Chuba Hubbard have been some of the best steals of the draft and have really rounded out his team." },
      { team: "Logan", rank: 2, record: "4-2",    loganDescription: "A loss this week was all but guaranteed with Amon Ra and Ja'Marr on bye, to the point that it was even a talking point during trade conversations with Andy. However, in large part due to grabbing Germie Bernard off waivers, I snapped my embarassing two-game losing streak and now get my best two players back for the future.", 
                                                  andyDescription: "Logan has managed to go 3-0 against the North compared to the rest of the division who is 0-4 when facing them. He put up 139 points without his top two wideouts and has gotten back into a roll after losing to James." },
      { team: "Whieldon", rank: 3, record: "4-2", loganDescription: "Whieldon - Don't let the slow start and less-than-ideal QB situation distract you from the fact that Whieldon is hotter than any other team in the league right now. His division also looks clear for him to dominate. Three straight weeks of 140 or more? If he keeps this streak up, it'll be tough for anyone to topple him.", 
                                                  andyDescription: "Whieldon's team has fully awoken, putting up 140 points in his last three games and taking the reigns of the South. He can further cement his lead by pummeling Brady next week for the division lead." },
      { team: "Max", rank: 4, record: "4-2",      loganDescription: "Max has slowly been sliding down in points the last few weeks, which is fine against the Roberts of the league but was swiftly capitalized on by Andrew this week. Max's team undeniably has the \"it factor\", but division wins are going to come at a premium for him unless he can find his groove again.", 
                                                  andyDescription: "Max has looked a lot shakier these last couple weeks, but he did have some of his best players out on bye. It's something to monitor over the next couple games." },
      { team: "Landon", rank: 5, record: "4-2",   loganDescription: "Right after setting a league record score, he drops an 88 point stinker of a game? The worst part about it is that he didn't even have anyone THAT critical on a bye week. Maybe the inconsistency is just part of his team now, but the ceiling still feels sky high.",
                                                  andyDescription: "Landon's team is capable of truly anything, and you never know what's coming. The only explanation I can find is that his team always has a stinker right after taking the #1 seed. It's really the only answer I've got." },
      { team: "Andy", rank: 6, record: "3-3",     loganDescription: "Andy scored third most in the league and still lost, an unlucky stat shared only by his division rivals Andrew and Max. That really is a good showcase for how strong his division is, which just makes the setback from this loss all the more difficult to recover from despite an all around decent team.", 
                                                  andyDescription: "This was the most points I've scored this season and it sadly came in a loss. Even worse, I failed to capitalize on the rest of the division falling to 4-2. However, I'm getting some important pieces back from bye and injury this week, so I should be fine." },
      { team: "Matt", rank: 7, record: "3-3",     loganDescription: "At the end of the day, all you need to know is that he's scored under 100 points 3 weeks in a row. The win this week shouldn't deflect attention from how poor his team has performed recently, even if you would expect the talent on the roster to show out more consistently.",
                                                  andyDescription: "Matt got a potentially season-saving win and finally, finally beat Robert. He hasn't put up more than 100 points the last three weeks though, but at least he gets Gibbs back from the bye." },
      { team: "Ethan", rank: 8, record: "3-3",    loganDescription: "How is he 3-3? This team is fraudulent from top to bottom. At least he can get the occasional lucky game where the Falcons offense goes off. His team is also relatively injury-free the last couple weeks, unlike someone else...", 
                                                  andyDescription: "Ethan got saved by some late-game heroics from the Falcons offense, and improved to 3-3. It's not an impressive three wins--he's only broken 100 points twice this year--but three wins is three wins." },
      { team: "Brady", rank: 9, record: "3-3",    loganDescription: "How is he 3-3? This team is fraudulent from top to bottom. He barely has enough healthy players to field a full team, much less a competitive one. He's only higher than everyone else below out of respect for his record, but even that can quickly change with just a couple more bad weeks.", 
                                                  andyDescription: "Everything is unraveling for Brady. Everyone's injured and he's lost three in a row. He needs some players to be healthy next week against Whieldon, bad." },
      { team: "Dillon", rank: 10, record: "1-4",  loganDescription: "Dillon looked to have this one against a floundering Ethan team in the bag, right up until Ethan stormed back for an insane win. I'm sure his hope in the roster is still there, but when tied for the worst record in the league, there's not much to buy into long-term.", 
                                                  andyDescription: "Click on Dillon's players in fantasy and you'll see almost all of them are top 15 at their position. If he can just get everyone on the same page, now with Josh Jacobs back, he could at the very least be competitive. At 1-5 his season is over, but he could at least avoid the dreaded bottom two seeds in the Loser's Bracket." },
      { team: "Robert", rank: 11, record: "1-5",  loganDescription: "A Monday night player vs player showdon, down a single point? These are the games that the Robert of seasons past wins easily. Unfortunately, Mike Evans went down, showing that the magic is truly gone.",
                                                  andyDescription: "Robert lost for the first time ever to Matt last week, and is now sitting solely in last in his division at 1-5. Nah, read that again. You love to see it." },
      { team: "James", rank: 12, record: "2-4",   loganDescription: "Update: His team is, in fact, still injured. He won this week, but that doesn't change the prognosis here.", 
                                                  andyDescription: "Another victory, another devastating injury, this time to Terry McLaurin. Every week players are shuffling in and out with injury. If he could just get everyone back healthy, he'd have some semblance of a chance, but it's over." },
    ]
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
