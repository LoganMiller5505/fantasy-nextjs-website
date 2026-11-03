// The ESPN feed (lib/espn.ts) worked into league weeks, which every ESPN stat starts from. Team
// stats count the weeks ESPN has closed. A league week can span two NFL weeks; lineups are set and
// scored per NFL week, then summed into the league week.

import type { Espn, RosterSpot } from "@/lib/espn"
import { groupBy, round, sum, type Scope, type Side } from "../stats"

export const GROUPS = ["QB", "RB", "WR", "TE", "FLEX", "D/ST", "K"] as const
export type Group = (typeof GROUPS)[number]
export const FLEX_POSITIONS = new Set(["RB", "WR", "TE"])

export const pts = (s: RosterSpot) => s.points ?? 0
export const inScope = (scope: Scope) => (x: { year: number }) => scope === "all" || x.year === scope
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0)

// A player in a lineup call
export type Choice = { name: string; points: number }
// A starter who was never going to score: on bye, ruled out (ESPN projected him for zero) or with
// no game. `replacement` is the best bench player who could have taken his slot.
export type DeadStart = { name: string; slot: string; points: number; replacement: Choice | null; cost: number }

// One manager's league week, from their ESPN roster
export type TeamWeek = {
  year: number
  week_no: number
  short: string
  manager: string
  playoff: boolean
  started: number
  projected: number
  optimal: number
  espnPick: number // what the lineup ESPN's projections would have picked from this roster scored
  bench: number
  byGroup: Record<Group, number>
  blunder: { benched: Choice; started: Choice; gain: number } | null // the costliest single swap
  dead: DeadStart[]
  top: (Choice & { position: string }) | null // the best starter
  dud: (Choice & { projected: number }) | null // the starter furthest below his projection
  side: Side | undefined // the league game, once the sheet has it
  oppProjected: number | null
}

// Where a player on a manager's roster came from that season
export type Origin = "Draft" | "Trade" | "Pickup"

export type RosterBase = {
  weeks: TeamWeek[] // closed regular-season weeks
  playoffWeeks: TeamWeek[] // closed playoff weeks, consolation games too
  starts: RosterSpot[] // starters in closed regular-season weeks
  allStarts: RosterSpot[] // starters in every closed week, playoffs too
  rostered: RosterSpot[] // everyone on a roster in every closed week, bench and IR too
  origin: (s: { year: number; manager: string; player_id: number }) => Origin
  week: (year: number, period: number) => string // an NFL week's league week, "W6"
  weekNo: (year: number, period: number) => number
  name: (playerId: number) => string
  position: (playerId: number) => string
}

// The best legal lineup from the players on the roster by `value` (IR can't start): each
// single-position slot takes the best at that position, then FLEX the best RB/WR/TE left. Greedy is
// exact for these slots.
export function optimal(
  spots: RosterSpot[],
  counts: Map<string, number>,
  position: (id: number) => string,
  value: (s: RosterSpot) => number = pts
) {
  const pool = spots.filter((s) => s.slot !== "IR").sort((a, b) => value(b) - value(a))
  const used = new Set<RosterSpot>()
  for (const [slot, n] of counts) {
    if (slot !== "FLEX") pool.filter((s) => position(s.player_id) === slot).slice(0, n).forEach((s) => used.add(s))
  }
  pool
    .filter((s) => !used.has(s) && FLEX_POSITIONS.has(position(s.player_id)))
    .slice(0, counts.get("FLEX") ?? 0)
    .forEach((s) => used.add(s))
  return [...used]
}

// Whether a bench player could have taken a starter's slot
const fits = (slot: string, position: string) => slot === position || (slot === "FLEX" && FLEX_POSITIONS.has(position))

// The bench player who would have added the most in place of a starter whose slot he could fill
function blunder(spots: RosterSpot[], name: (id: number) => string, position: (id: number) => string) {
  let best: TeamWeek["blunder"] = null
  for (const b of spots.filter((s) => s.slot === "BE")) {
    for (const s of spots.filter((s) => s.starter)) {
      const gain = round(pts(b) - pts(s), 2)
      if (fits(s.slot, position(b.player_id)) && gain > (best?.gain ?? 0)) {
        best = { benched: { name: name(b.player_id), points: pts(b) }, started: { name: name(s.player_id), points: pts(s) }, gain }
      }
    }
  }
  return best
}

function deadStarts(spots: RosterSpot[], name: (id: number) => string, position: (id: number) => string): DeadStart[] {
  const bench = spots.filter((s) => s.slot === "BE").sort((a, b) => pts(b) - pts(a))
  return spots
    .filter((s) => s.starter && (s.points == null || s.projected === 0))
    .map((s) => {
      const r = bench.find((b) => fits(s.slot, position(b.player_id)))
      const replacement = r ? { name: name(r.player_id), points: pts(r) } : null
      return { name: name(s.player_id), slot: s.slot, points: pts(s), replacement, cost: round(Math.max(0, (replacement?.points ?? 0) - pts(s)), 2) }
    })
}

export function rosterBase(espn: Espn, sides: Side[]): RosterBase {
  const name = (id: number) => espn.players[id]?.name ?? "Unknown"
  const position = (id: number) => espn.players[id]?.position ?? "?"
  const closed = new Map<string, { week_no: number; playoff: boolean }>()
  for (const p of espn.periods) {
    if (p.is_final) for (const sp of p.scoring_periods) closed.set(`${p.year}|${sp}`, { week_no: p.week_no, playoff: p.is_playoff })
  }
  const regular = (s: RosterSpot) => closed.get(`${s.year}|${s.period}`)?.playoff === false
  const side = new Map(sides.map((s) => [`${s.year}|${s.week_no}|${s.manager}`, s]))
  const counts = new Map(
    [...groupBy(espn.slots.filter((r) => r.starter), (r) => r.year)].map(([year, rules]) => [year, new Map(rules.map((r) => [r.slot, r.count]))])
  )
  const rostered = espn.roster.filter((s) => closed.has(`${s.year}|${s.period}`))

  const weeks = new Map<string, TeamWeek>()
  for (const spots of groupBy(rostered, (s) => `${s.year}|${s.period}|${s.manager}`).values()) {
    const { year, period, manager } = spots[0]
    const { week_no, playoff } = closed.get(`${year}|${period}`)!
    const key = `${year}|${week_no}|${manager}`
    const game = side.get(key)
    const w = weeks.get(key) ?? {
      year,
      week_no,
      short: game?.short ?? `W${week_no}`,
      manager,
      playoff,
      started: 0,
      projected: 0,
      optimal: 0,
      espnPick: 0,
      bench: 0,
      byGroup: Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>,
      blunder: null,
      dead: [],
      top: null,
      dud: null,
      side: game,
      oppProjected: null,
    }
    const starters = spots.filter((s) => s.starter)
    const slots = counts.get(year)!
    w.started += sum(starters.map(pts))
    w.projected += sum(starters.map((s) => s.projected ?? 0))
    w.optimal += sum(optimal(spots, slots, position).map(pts))
    w.espnPick += sum(optimal(spots, slots, position, (s) => s.projected ?? 0).map(pts))
    w.bench += sum(spots.filter((s) => s.slot === "BE").map(pts))
    for (const s of starters) if (s.slot in w.byGroup) w.byGroup[s.slot as Group] += pts(s)
    const swap = blunder(spots, name, position)
    if (swap && swap.gain > (w.blunder?.gain ?? 0)) w.blunder = swap
    w.dead.push(...deadStarts(spots, name, position))
    for (const s of starters) {
      if (pts(s) > (w.top?.points ?? -Infinity)) w.top = { name: name(s.player_id), position: position(s.player_id), points: pts(s) }
      const miss = (s.projected ?? 0) - pts(s)
      if (s.projected && miss > (w.dud ? w.dud.projected - w.dud.points : 0)) w.dud = { name: name(s.player_id), points: pts(s), projected: s.projected }
    }
    weeks.set(key, w)
  }
  for (const w of weeks.values()) {
    w.oppProjected = w.side ? (weeks.get(`${w.year}|${w.week_no}|${w.side.opponent}`)?.projected ?? null) : null
  }
  const ordered = [...weeks.values()].sort((a, b) => a.year - b.year || a.week_no - b.week_no || a.manager.localeCompare(b.manager))

  const drafted = new Set(espn.picks.map((p) => `${p.year}|${p.manager}|${p.player_id}`))
  const traded = new Set(espn.trades.flatMap((t) => t.items.map((i) => `${t.year}|${i.to}|${i.player_id}`)))
  const allStarts = rostered.filter((s) => s.starter)
  const weekOf = new Map(espn.periods.flatMap((p) => p.scoring_periods.map((sp) => [`${p.year}|${sp}`, p.week_no])))
  return {
    weeks: ordered.filter((w) => !w.playoff),
    playoffWeeks: ordered.filter((w) => w.playoff),
    starts: allStarts.filter(regular),
    allStarts,
    rostered,
    origin: ({ year, manager, player_id }) => {
      const key = `${year}|${manager}|${player_id}`
      return drafted.has(key) ? "Draft" : traded.has(key) ? "Trade" : "Pickup"
    },
    week: (year, period) => `W${weekOf.get(`${year}|${period}`) ?? period}`,
    weekNo: (year, period) => weekOf.get(`${year}|${period}`) ?? period,
    name,
    position,
  }
}
