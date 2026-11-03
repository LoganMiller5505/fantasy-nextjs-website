// The draft: each pick against where he finished, and each manager's habits

import type { Espn } from "@/lib/espn"
import { mean, pts, type RosterBase } from "./base"
import { groupBy, round, standings, sum, type Scope, type Side } from "../stats"

export type DraftPickRow = {
  year: number
  overall: number
  round: number
  round_pick: number
  manager: string
  name: string
  short: string // "J. Chase"
  position: string
  points: number // full NFL season, whoever had him
  forTeam: number // points as a starter for the manager who drafted him (regular season)
  drafted: number // nth at his position taken
  finished: number // nth at his position in season points, among everyone
  value: number // drafted - finished: positive beat his draft slot
  lineupFinish: number // nth of his position's draftees in points for the lineup that drafted them
  lineupValue: number // drafted - lineupFinish
  auto: boolean // ESPN marks the pick as auto-drafted
}

// Steals and busts by full-season points, or by points in the drafting manager's lineup
export type DraftMeasure = "season" | "lineup"

const shortName = (name: string) => {
  const [first, ...rest] = name.split(" ")
  return rest.length && !name.endsWith("D/ST") ? `${first[0]}. ${rest.join(" ")}` : name
}

export function draftPicks(espn: Espn, base: RosterBase, year: number): DraftPickRow[] {
  const season = espn.seasonPoints.filter((s) => s.year === year)
  const points = new Map(season.map((s) => [s.player_id, s.points]))
  const finished = new Map<number, number>()
  for (const group of groupBy(season, (s) => base.position(s.player_id)).values()) {
    group.sort((a, b) => b.points - a.points).forEach((s, i) => finished.set(s.player_id, i + 1))
  }
  const forTeam = new Map(
    [...groupBy(base.starts.filter((s) => s.year === year), (s) => `${s.manager}|${s.player_id}`)].map(([k, spots]) => [k, sum(spots.map(pts))])
  )
  const taken = new Map<string, number>()
  const picks = espn.picks
    .filter((p) => p.year === year)
    .sort((a, b) => a.overall - b.overall)
    .map((p) => {
      const position = base.position(p.player_id)
      const drafted = (taken.get(position) ?? 0) + 1
      taken.set(position, drafted)
      const finish = finished.get(p.player_id) ?? finished.size + 1
      return {
        year,
        overall: p.overall,
        round: p.round,
        round_pick: p.round_pick,
        manager: p.manager,
        name: base.name(p.player_id),
        short: shortName(base.name(p.player_id)),
        position,
        points: round(points.get(p.player_id) ?? 0, 1),
        forTeam: round(forTeam.get(`${p.manager}|${p.player_id}`) ?? 0, 1),
        drafted,
        finished: finish,
        value: drafted - finish,
        lineupFinish: 0,
        lineupValue: 0,
        auto: p.auto,
      }
    })
  for (const group of groupBy(picks, (p) => p.position).values()) {
    [...group]
      .sort((a, b) => b.forTeam - a.forTeam || a.overall - b.overall)
      .forEach((p, i) => {
        p.lineupFinish = i + 1
        p.lineupValue = p.drafted - p.lineupFinish
      })
  }
  return picks
}

// One season's draft board
export function draft(espn: Espn, base: RosterBase, year: number) {
  const picks = draftPicks(espn, base, year)
  // The draft order: who picked first, second... in round 1
  const order = picks.filter((p) => p.round === 1).map((p) => p.manager)
  const rounds = [...groupBy(picks, (p) => p.round)].map(([round, ps]) => ({ round, picks: order.map((m) => ps.find((p) => p.manager === m) ?? null) }))
  return { year, order, rounds }
}

// Picks from every draft in scope, without kickers and defenses: they're taken late and score
// evenly, so their places swing widely
export function skillPicks(espn: Espn, base: RosterBase, scope: Scope) {
  const years = [...new Set(espn.picks.map((p) => p.year))].filter((y) => scope === "all" || y === scope)
  return years.flatMap((y) => draftPicks(espn, base, y)).filter((p) => p.position !== "K" && p.position !== "D/ST")
}

// The first half of a draft, where a miss costs the most
const early = (espn: Espn) => {
  const rounds = new Map([...groupBy(espn.picks, (p) => p.year)].map(([y, ps]) => [y, Math.max(...ps.map((p) => p.round))]))
  return (p: DraftPickRow) => p.round <= Math.ceil(rounds.get(p.year)! / 2)
}

export function draftExtremes(espn: Espn, base: RosterBase, scope: Scope, n = 10) {
  const picks = skillPicks(espn, base, scope)
  const isEarly = early(espn)
  const lists = (value: (p: DraftPickRow) => number, points: (p: DraftPickRow) => number) => ({
    steals: [...picks].sort((a, b) => value(b) - value(a) || points(b) - points(a)).slice(0, n),
    busts: picks.filter(isEarly).sort((a, b) => value(a) - value(b) || a.overall - b.overall).slice(0, n),
  })
  return {
    season: lists((p) => p.value, (p) => p.points),
    lineup: lists((p) => p.lineupValue, (p) => p.forTeam),
  } satisfies Record<DraftMeasure, unknown>
}

export type DraftGradeRow = {
  player: string
  Picks: number // first-half picks, kickers and defenses aside
  "Avg value": number
  "Avg lineup value": number
  "Hit %": number // picks that finished at or above their slot
  Best: string
  Worst: string
}

// How well each manager drafts, judged on the first half of the draft
export function draftGrades(espn: Espn, base: RosterBase, scope: Scope): DraftGradeRow[] {
  const picks = skillPicks(espn, base, scope)
  const isEarly = early(espn)
  // Across seasons a player can be one manager's best and worst pick, so say which year
  const label = (p: DraftPickRow) => `${p.name}${scope === "all" ? ` '${String(p.year).slice(2)}` : ""} (${p.value > 0 ? "+" : ""}${p.value})`
  return [...groupBy(picks, (p) => p.manager)]
    .map(([player, mine]) => {
      const first = mine.filter(isEarly)
      const byValue = [...first].sort((a, b) => b.value - a.value)
      return {
        player,
        Picks: first.length,
        "Avg value": round(mean(first.map((p) => p.value)), 1),
        "Avg lineup value": round(mean(first.map((p) => p.lineupValue)), 1),
        "Hit %": round((100 * first.filter((p) => p.value >= 0).length) / (first.length || 1), 1),
        Best: byValue.length ? label(byValue[0]) : "",
        Worst: byValue.length ? label(byValue[byValue.length - 1]) : "",
      }
    })
    .sort((a, b) => b["Avg value"] - a["Avg value"])
}

// ESPN's draft-day projected finish against the real one (or the standings so far)
export function preseasonVsFinish(espn: Espn, sides: Side[], year: number) {
  const teams = espn.teams.filter((t) => t.year === year)
  const table = standings(sides.filter((s) => s.year === year)).map((r) => r.manager)
  const inProgress = teams.some((t) => t.final_rank == null)
  return {
    inProgress,
    rows: teams
      .filter((t) => t.draft_rank)
      .map((t) => {
        const finish = inProgress ? table.indexOf(t.manager) + 1 : t.final_rank!
        return { manager: t.manager, projected: t.draft_rank!, finish, change: t.draft_rank! - finish }
      })
      .filter((r) => r.finish > 0)
      .sort((a, b) => b.change - a.change || a.finish - b.finish),
  }
}

export const HABITS = ["First QB", "First TE", "First D/ST", "First K", "RBs in R1–5", "WRs in R1–5", "Auto picks"] as const

// How each manager drafts: the round each position first goes, averaged over their drafts, how many
// RBs and WRs they take early, and how many picks ESPN marks as auto-drafted
export function draftHabits(espn: Espn, base: RosterBase, scope: Scope) {
  const years = [...new Set(espn.picks.map((p) => p.year))].filter((y) => scope === "all" || y === scope)
  const picks = years.flatMap((y) => draftPicks(espn, base, y))
  const rows = [...groupBy(picks, (p) => p.manager)]
    .map(([manager, mine]) => {
      const drafts = [...groupBy(mine, (p) => p.year).values()]
      const first = (position: string) => {
        const rounds = drafts.flatMap((d) => {
          const r = d.filter((p) => p.position === position).map((p) => p.round)
          return r.length ? [Math.min(...r)] : []
        })
        return rounds.length ? round(mean(rounds), 1) : null
      }
      const early = (position: string) => round(mean(drafts.map((d) => d.filter((p) => p.round <= 5 && p.position === position).length)), 1)
      return {
        manager,
        drafts: drafts.length,
        values: [first("QB"), first("TE"), first("D/ST"), first("K"), early("RB"), early("WR"), mine.filter((p) => p.auto).length],
      }
    })
    .sort((a, b) => a.manager.localeCompare(b.manager))
  const average = HABITS.map((_, i) => {
    const xs = rows.flatMap((r) => (r.values[i] == null ? [] : [r.values[i]!]))
    return round(mean(xs), 1)
  })
  return { columns: [...HABITS], rows, average }
}
