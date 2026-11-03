import "server-only"
// The ESPN-based additions to each statistics tab, built once here so a tab and the preview page
// (which gathers every addition in one place) show the same thing

import { getRosters, getStats } from "../data"
import { powerRankings, standings, type Scope } from "../stats"
import { activity, pointSources, rosterChurn, streaming, tradeExtremes, tradeLedger, tradeMarket, tradeRecords, travelers, waiverClaims, pickupMoves } from "./moves"
import { benchBlunders, deadStarts, lineupEfficiency, opponentLineups, vsEspnLineup } from "./lineups"
import { draft, draftExtremes, draftGrades, draftHabits, preseasonVsFinish } from "./draft"
import { playerGames, positionScoring, statCategories, teamMvps } from "./scoring"
import { projectedUpsets, projectionRows } from "./projections"
import { byeCrunch, inSeasonProjection, restOfSeason, thisWeek, weeklyHonours } from "./season"
import { playerNemeses } from "./h2h"
import { playoffHeroes, playoffLineups } from "./playoffs"
import { espnGameRecords, espnSeasonRecords, leagueSettings } from "./records"
import { managerEspn } from "./managers"
import { fandom, finalDaySwings, kickoffSlots, stacks } from "./games"

export async function espnContext() {
  const [stats, { espn, base }] = await Promise.all([getStats(), getRosters()])
  return { stats, espn, base, scopes: ["all", ...stats.seasons] as Scope[] }
}
type Ctx = Awaited<ReturnType<typeof espnContext>>

const byScope = <T,>(ctx: Ctx, derive: (scope: Scope) => T) => Object.fromEntries(ctx.scopes.map((s) => [s, derive(s)])) as Record<string, T>
const bySeason = <T,>(ctx: Ctx, derive: (year: number) => T) => Object.fromEntries(ctx.stats.seasons.map((y) => [y, derive(y)])) as Record<number, T>

export const seasonAdditions = (ctx: Ctx) => ({ honours: bySeason(ctx, (y) => weeklyHonours(ctx.base, y)) })

export function outlookAdditions({ espn, base, stats }: Ctx) {
  const year = stats.current
  return { thisWeek: thisWeek(espn, base, year), restOfSeason: restOfSeason(espn, base, stats.sides, year), byes: byeCrunch(espn, base, year) }
}

export function rankingsAdditions(ctx: Ctx) {
  const { espn, stats } = ctx
  const projected = inSeasonProjection(espn, stats.current)
  const ballots = powerRankings(stats.league, stats.sides)
  const consensus = new Map(ballots.year === stats.current ? ballots.latestTable.map((r) => [r.manager, r.consensus]) : [])
  const table = standings(stats.sides.filter((s) => s.year === stats.current)).map((r) => r.manager)
  return {
    preseason: bySeason(ctx, (y) => preseasonVsFinish(espn, stats.sides, y)),
    inSeason: projected
      ? projected
          .map((p) => ({ ...p, consensus: consensus.get(p.manager) ?? null, standing: table.indexOf(p.manager) + 1 || null }))
          .sort((a, b) => a.rank - b.rank)
      : null,
  }
}

export const luckAdditions = (ctx: Ctx) =>
  byScope(ctx, (s) => ({
    projections: { rows: projectionRows(ctx.base, s), ...projectedUpsets(ctx.base, s) },
    opponents: opponentLineups(ctx.base, s),
    swings: finalDaySwings(ctx.base, s),
  }))

export const lineupsTab = (ctx: Ctx) =>
  byScope(ctx, (s) => ({
    efficiency: lineupEfficiency(ctx.base, s),
    blunders: benchBlunders(ctx.base, s),
    dead: deadStarts(ctx.base, s),
    vsEspn: vsEspnLineup(ctx.base, s),
    slots: kickoffSlots(ctx.base, s),
  }))

export const scoringAdditions = (ctx: Ctx) =>
  byScope(ctx, (s) => ({
    positions: positionScoring(ctx.base, s),
    mvps: teamMvps(ctx.base, s),
    categories: statCategories(ctx.espn, ctx.base, s),
    games: playerGames(ctx.base, s),
    stacks: stacks(ctx.base, s),
    fandom: fandom(ctx.base, s),
  }))

export const h2hAdditions = ({ espn, base, stats }: Ctx) => ({ ...playerNemeses(base, stats.sides), trades: tradeLedger(espn, base, "all") })

export function draftTab(ctx: Ctx) {
  const { espn, base } = ctx
  const ledgers = byScope(ctx, (s) => tradeLedger(espn, base, s))
  return {
    drafts: bySeason(ctx, (y) => draft(espn, base, y)),
    moves: byScope(ctx, (s) => ({ sources: pointSources(base, s), trades: ledgers[String(s)], activity: activity(espn, base, s) })),
    bestWorst: byScope(ctx, (s) => ({
      moves: pickupMoves(espn, base, s),
      draft: draftExtremes(espn, base, s),
      grades: draftGrades(espn, base, s),
      trades: tradeExtremes(ledgers[String(s)]),
      tradeRecords: tradeRecords(ledgers[String(s)]),
    })),
    more: byScope(ctx, (s) => ({
      habits: draftHabits(espn, base, s),
      claims: waiverClaims(espn, base, s),
      market: tradeMarket(espn, s),
      churn: rosterChurn(base, s),
      travelers: travelers(base, s),
      streaming: streaming(base, s),
    })),
  }
}

export const playoffsAdditions = ({ base, stats }: Ctx) => ({
  lineups: playoffLineups(base, stats.results),
  heroes: playoffHeroes(base, stats.results),
})

export const recordsAdditions = ({ espn, base }: Ctx) => ({
  games: espnGameRecords(base),
  seasons: espnSeasonRecords(espn, base),
  settings: leagueSettings(espn),
})

export const managerAdditions = ({ espn, base, stats }: Ctx) => managerEspn(espn, base, stats.sides)

export type SeasonAdditionsData = ReturnType<typeof seasonAdditions>
export type OutlookAdditionsData = ReturnType<typeof outlookAdditions>
export type RankingsAdditionsData = ReturnType<typeof rankingsAdditions>
export type LuckAdditionsData = ReturnType<typeof luckAdditions>[string]
export type LineupsTabData = ReturnType<typeof lineupsTab>[string]
export type ScoringAdditionsData = ReturnType<typeof scoringAdditions>[string]
export type H2HAdditionsData = ReturnType<typeof h2hAdditions>
export type DraftTabData = ReturnType<typeof draftTab>
export type PlayoffsAdditionsData = ReturnType<typeof playoffsAdditions>
export type RecordsAdditionsData = ReturnType<typeof recordsAdditions>
export type ManagerAdditionsData = ReturnType<typeof managerAdditions>[string]
