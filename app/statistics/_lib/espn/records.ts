// All-time records only ESPN's data can set: players, lineups, the draft and moves, and how the
// league's own rules have changed

import type { Espn } from "@/lib/espn"
import { pts, type RosterBase } from "./base"
import { draftExtremes } from "./draft"
import { lineupEfficiency } from "./lineups"
import { moveRows, tradeExtremes, tradeLedger } from "./moves"
import { projectedUpsets } from "./projections"
import { playerGames } from "./scoring"

// A record as a stat tile shows it
export type RecordTile = { label: string; value: string; detail: string }

const best = <T,>(xs: T[], score: (x: T) => number) => (xs.length ? xs.reduce((a, b) => (score(b) > score(a) ? b : a)) : null)
const f1 = (x: number) => x.toFixed(1)
const pct = (x: number) => `${(100 * x).toFixed(1)}%`

export function espnGameRecords(base: RosterBase) {
  const starter = best(base.allStarts, pts)
  const bench = best(base.rostered.filter((s) => s.slot === "BE"), pts)
  const left = best(base.weeks, (w) => w.optimal - w.started)
  const dead = best(
    base.weeks.flatMap((w) => w.dead.map((d) => ({ w, d }))),
    (x) => x.d.cost
  )
  const worst = best(base.weeks.filter((w) => w.optimal > 0), (w) => -w.started / w.optimal)
  const upset = projectedUpsets(base, "all", 1).upsets[0]
  const at = (year: number, week: string) => `${year} ${week}`
  const tiles: RecordTile[] = [
    ...(starter
      ? [{ label: "Most by a starter", value: f1(pts(starter)), detail: `${base.name(starter.player_id)} for ${starter.manager}, ${at(starter.year, base.week(starter.year, starter.period))}` }]
      : []),
    ...(bench
      ? [{ label: "Most on a bench", value: f1(pts(bench)), detail: `${base.name(bench.player_id)}, benched by ${bench.manager}, ${at(bench.year, base.week(bench.year, bench.period))}` }]
      : []),
    ...(left ? [{ label: "Most left on the bench", value: f1(left.optimal - left.started), detail: `${left.manager}, ${at(left.year, left.short)}` }] : []),
    ...(worst
      ? [{ label: "Least efficient lineup", value: pct(worst.started / worst.optimal), detail: `${worst.manager}, ${at(worst.year, worst.short)}: ${f1(worst.started)} of a possible ${f1(worst.optimal)}` }]
      : []),
    ...(upset
      ? [{ label: "Biggest upset vs projections", value: f1(upset.gap), detail: `${upset.winner} over ${upset.loser}, ${at(upset.year, upset.short)}` }]
      : []),
    ...(dead
      ? [{ label: "Costliest dead start", value: f1(dead.d.cost), detail: `${dead.w.manager} started ${dead.d.name}, ${at(dead.w.year, dead.w.short)}` }]
      : []),
  ]
  return { tiles, games: playerGames(base, "all", 10, base.allStarts) }
}

export function espnSeasonRecords(espn: Espn, base: RosterBase) {
  const years = [...new Set(base.weeks.map((w) => w.year))]
  const seasons = years.flatMap((year) => lineupEfficiency(base, year).map((r) => ({ ...r, year })))
  const sharpest = best(seasons, (s) => s.Efficiency)
  const loosest = best(seasons, (s) => -s.Efficiency)
  const adds = best(espn.teams, (t) => t.acquisitions)
  const moves = moveRows(espn, base, "all")
  const picks = draftExtremes(espn, base, "all", 1).season
  const steal = picks.steals[0]
  const bust = picks.busts[0]
  const trade = tradeExtremes(tradeLedger(espn, base, "all"), 1).best[0]
  const tiles: RecordTile[] = [
    ...(sharpest ? [{ label: "Best lineup season", value: pct(sharpest.Efficiency), detail: `${sharpest.player}, ${sharpest.year}` }] : []),
    ...(loosest ? [{ label: "Worst lineup season", value: pct(loosest.Efficiency), detail: `${loosest.player}, ${loosest.year}` }] : []),
    ...(adds ? [{ label: "Most adds in a season", value: String(adds.acquisitions), detail: `${adds.manager}, ${adds.year}` }] : []),
    ...(moves[0]
      ? [{ label: "Best pickup", value: `+${f1(moves[0].net)}`, detail: `${moves[0].manager} added ${moves[0].added.name}, ${moves[0].year} ${moves[0].week}` }]
      : []),
    ...(moves.length
      ? [
          {
            label: "Worst drop",
            value: f1(moves[moves.length - 1].net),
            detail: `${moves[moves.length - 1].manager} let ${moves[moves.length - 1].dropped.map((d) => d.name).join(" and ") || "nobody"} go, ${moves[moves.length - 1].year} ${moves[moves.length - 1].week}`,
          },
        ]
      : []),
    ...(steal
      ? [{ label: "Biggest draft steal", value: `+${steal.value}`, detail: `${steal.manager}: ${steal.name}, ${steal.position}${steal.drafted} → ${steal.position}${steal.finished}, ${steal.year}` }]
      : []),
    ...(bust
      ? [{ label: "Biggest draft bust", value: String(bust.value), detail: `${bust.manager}: ${bust.name}, ${bust.position}${bust.drafted} → ${bust.position}${bust.finished}, ${bust.year}` }]
      : []),
    ...(trade
      ? [{ label: "Most lopsided trade", value: `+${f1(trade.margin)}`, detail: `${trade.manager} over ${trade.partners.join(", ")}, ${trade.year} ${trade.week}` }]
      : []),
  ]
  return tiles
}

const SLOTS = ["QB", "RB", "WR", "TE", "FLEX", "D/ST", "K", "BE", "IR"]
const words = (x: string | null) => (x ? x.toLowerCase().replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()) : "—")

// The league's settings season by season, and every scoring rule that has changed
export function leagueSettings(espn: Espn) {
  const seasons = [...espn.seasons].sort((a, b) => a.year - b.year)
  const slot = (year: number, s: string) => String(espn.slots.find((r) => r.year === year && r.slot === s)?.count ?? 0)
  const rows = [
    { label: "Teams", values: seasons.map((s) => String(s.size)) },
    { label: "Playoff teams", values: seasons.map((s) => String(s.playoff_teams)) },
    { label: "Regular-season weeks", values: seasons.map((s) => String(s.regular_weeks)) },
    { label: "Scoring", values: seasons.map((s) => s.scoring ?? "—") },
    { label: "Pickups", values: seasons.map((s) => words(s.acquisition)) },
    { label: "Draft", values: seasons.map((s) => words(s.draft_type)) },
    ...SLOTS.map((s) => ({ label: `${s} slots`, values: seasons.map((x) => slot(x.year, s)) })),
  ]
  const byStat = new Map<string, Map<number, number>>()
  for (const r of espn.scoring) {
    if (!byStat.has(r.stat)) byStat.set(r.stat, new Map())
    byStat.get(r.stat)!.set(r.year, r.points)
  }
  const changes = [...byStat]
    .map(([stat, by]) => ({ stat, values: seasons.map((s) => by.get(s.year) ?? null) }))
    .filter((c) => new Set(c.values.map(String)).size > 1)
    .sort((a, b) => a.stat.localeCompare(b.stat))
  return { years: seasons.map((s) => s.year), rows, changes }
}
