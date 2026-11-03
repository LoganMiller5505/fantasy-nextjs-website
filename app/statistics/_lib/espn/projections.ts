// How lineups did against ESPN's projections for them

import { inScope, mean, type RosterBase, type TeamWeek } from "./base"
import { groupBy, round, type Scope } from "../stats"

export type ProjectionRow = {
  player: string
  Weeks: number
  "Actual/wk": number
  "Proj/wk": number
  "+/- per wk": number
  "Beat proj": string // weeks above / below projection
}

export function projectionRows(base: RosterBase, scope: Scope): ProjectionRow[] {
  return [...groupBy(base.weeks.filter(inScope(scope)), (w) => w.manager)]
    .map(([player, mine]) => {
      const beat = mine.filter((w) => w.started > w.projected).length
      return {
        player,
        Weeks: mine.length,
        "Actual/wk": round(mean(mine.map((w) => w.started)), 1),
        "Proj/wk": round(mean(mine.map((w) => w.projected)), 1),
        "+/- per wk": round(mean(mine.map((w) => w.started - w.projected)), 1),
        "Beat proj": `${beat}-${mine.length - beat}`,
      }
    })
    .sort((a, b) => b["+/- per wk"] - a["+/- per wk"])
}

export type Upset = {
  year: number
  short: string
  winner: string
  loser: string
  winnerProj: number
  loserProj: number
  winnerPts: number
  loserPts: number
  gap: number // how far the winner was projected behind
}

// Games where ESPN's projected underdog won, and each manager's record as favourite and underdog
export function projectedUpsets(base: RosterBase, scope: Scope, n = 10) {
  const games = base.weeks.filter(inScope(scope)).filter((w) => w.side && w.oppProjected != null && w.projected !== w.oppProjected)
  const upsets: Upset[] = games
    .filter((w) => w.side!.win && w.projected < w.oppProjected!)
    .map((w) => ({
      year: w.year,
      short: w.short,
      winner: w.manager,
      loser: w.side!.opponent,
      winnerProj: round(w.projected, 1),
      loserProj: round(w.oppProjected!, 1),
      winnerPts: w.side!.pf,
      loserPts: w.side!.pa,
      gap: round(w.oppProjected! - w.projected, 1),
    }))
    .sort((a, b) => b.gap - a.gap)
  const favourites = games.filter((w) => w.projected > w.oppProjected!)
  const records = [...groupBy(games, (w) => w.manager)]
    .map(([manager, mine]) => {
      const fav = mine.filter((w) => w.projected > w.oppProjected!)
      const dog = mine.filter((w) => w.projected < w.oppProjected!)
      const wins = (xs: TeamWeek[]) => xs.filter((w) => w.side!.win).length
      return { manager, favW: wins(fav), favL: fav.length - wins(fav), dogW: wins(dog), dogL: dog.length - wins(dog) }
    })
    .sort((a, b) => b.dogW - a.dogW || a.dogL - b.dogL || a.manager.localeCompare(b.manager))
  return {
    upsets: upsets.slice(0, n),
    records,
    games: favourites.length,
    favouritesWon: favourites.filter((w) => w.side!.win).length,
  }
}
