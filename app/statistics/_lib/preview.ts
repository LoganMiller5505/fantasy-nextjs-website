// Derivations from the ESPN feed (lib/espn.ts) for the preview page: lineups, projections, the
// draft and roster moves, none of which the league tables can support. Team stats count the
// regular-season weeks ESPN has closed, like the luck stats. A league week can span two NFL weeks;
// lineups are set and scored per NFL week, then summed into the league week.

import type { Espn, RosterSpot } from "@/lib/espn"
import { groupBy, round, standings, sum, type Scope, type Side } from "./stats"

export const GROUPS = ["QB", "RB", "WR", "TE", "FLEX", "D/ST", "K"] as const
type Group = (typeof GROUPS)[number]
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"])

const pts = (s: RosterSpot) => s.points ?? 0
const inScope = (scope: Scope) => (x: { year: number }) => scope === "all" || x.year === scope
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0)

// A player in a lineup call
export type Choice = { name: string; points: number }

// One manager's league week, from their ESPN roster
export type TeamWeek = {
  year: number
  week_no: number
  short: string
  manager: string
  started: number
  projected: number
  optimal: number
  bench: number
  byGroup: Record<Group, number>
  blunder: { benched: Choice; started: Choice; gain: number } | null // the costliest single swap
  side: Side | undefined // the league game, once the sheet has it
  oppProjected: number | null
}

// Where a player on a manager's roster came from that season
export type Origin = "Draft" | "Trade" | "Pickup"

export type PreviewBase = {
  weeks: TeamWeek[]
  starts: RosterSpot[] // starters in closed regular-season weeks
  allStarts: RosterSpot[] // starters in every closed week, playoffs too
  origin: (s: { year: number; manager: string; player_id: number }) => Origin
  name: (playerId: number) => string
  position: (playerId: number) => string
}

// The best legal lineup from the players on the roster (IR can't start): each single-position slot
// takes the best at that position, then FLEX the best RB/WR/TE left. Greedy is exact for these slots.
function optimal(spots: RosterSpot[], counts: Map<string, number>, position: (id: number) => string) {
  const pool = spots.filter((s) => s.slot !== "IR").sort((a, b) => pts(b) - pts(a))
  const used = new Set<RosterSpot>()
  for (const [slot, n] of counts) {
    if (slot !== "FLEX") pool.filter((s) => position(s.player_id) === slot).slice(0, n).forEach((s) => used.add(s))
  }
  pool
    .filter((s) => !used.has(s) && FLEX_POSITIONS.has(position(s.player_id)))
    .slice(0, counts.get("FLEX") ?? 0)
    .forEach((s) => used.add(s))
  return sum([...used].map(pts))
}

// The bench player who would have added the most in place of a starter whose slot he could fill
function blunder(spots: RosterSpot[], name: (id: number) => string, position: (id: number) => string) {
  let best: TeamWeek["blunder"] = null
  for (const b of spots.filter((s) => s.slot === "BE")) {
    for (const s of spots.filter((s) => s.starter)) {
      const fits = s.slot === position(b.player_id) || (s.slot === "FLEX" && FLEX_POSITIONS.has(position(b.player_id)))
      const gain = round(pts(b) - pts(s), 2)
      if (fits && gain > (best?.gain ?? 0)) {
        best = { benched: { name: name(b.player_id), points: pts(b) }, started: { name: name(s.player_id), points: pts(s) }, gain }
      }
    }
  }
  return best
}

export function previewBase(espn: Espn, sides: Side[]): PreviewBase {
  const name = (id: number) => espn.players[id]?.name ?? "Unknown"
  const position = (id: number) => espn.players[id]?.position ?? "?"
  const closed = new Map<string, { week_no: number; playoff: boolean }>()
  for (const p of espn.periods) {
    if (p.is_final) for (const sp of p.scoring_periods) closed.set(`${p.year}|${sp}`, { week_no: p.week_no, playoff: p.is_playoff })
  }
  const regular = (s: RosterSpot) => closed.get(`${s.year}|${s.period}`)?.playoff === false
  const side = new Map(sides.map((s) => [`${s.year}|${s.week_no}|${s.manager}`, s]))
  const counts = new Map([...groupBy(espn.slots, (r) => r.year)].map(([year, rules]) => [year, new Map(rules.map((r) => [r.slot, r.count]))]))

  const weeks = new Map<string, TeamWeek>()
  for (const spots of groupBy(espn.roster.filter(regular), (s) => `${s.year}|${s.period}|${s.manager}`).values()) {
    const { year, period, manager } = spots[0]
    const week_no = closed.get(`${year}|${period}`)!.week_no
    const key = `${year}|${week_no}|${manager}`
    const game = side.get(key)
    const w = weeks.get(key) ?? {
      year,
      week_no,
      short: game?.short ?? `W${week_no}`,
      manager,
      started: 0,
      projected: 0,
      optimal: 0,
      bench: 0,
      byGroup: Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>,
      blunder: null,
      side: game,
      oppProjected: null,
    }
    const starters = spots.filter((s) => s.starter)
    w.started += sum(starters.map(pts))
    w.projected += sum(starters.map((s) => s.projected ?? 0))
    w.optimal += optimal(spots, counts.get(year)!, position)
    w.bench += sum(spots.filter((s) => s.slot === "BE").map(pts))
    for (const s of starters) if (s.slot in w.byGroup) w.byGroup[s.slot as Group] += pts(s)
    const swap = blunder(spots, name, position)
    if (swap && swap.gain > (w.blunder?.gain ?? 0)) w.blunder = swap
    weeks.set(key, w)
  }
  for (const w of weeks.values()) {
    w.oppProjected = w.side ? (weeks.get(`${w.year}|${w.week_no}|${w.side.opponent}`)?.projected ?? null) : null
  }

  const drafted = new Set(espn.picks.map((p) => `${p.year}|${p.manager}|${p.player_id}`))
  const traded = new Set(espn.trades.flatMap((t) => t.items.map((i) => `${t.year}|${i.to}|${i.player_id}`)))
  const allStarts = espn.roster.filter((s) => s.starter && closed.has(`${s.year}|${s.period}`))
  return {
    weeks: [...weeks.values()].sort((a, b) => a.year - b.year || a.week_no - b.week_no || a.manager.localeCompare(b.manager)),
    starts: allStarts.filter(regular),
    allStarts,
    origin: ({ year, manager, player_id }) => {
      const key = `${year}|${manager}|${player_id}`
      return drafted.has(key) ? "Draft" : traded.has(key) ? "Trade" : "Pickup"
    },
    name,
    position,
  }
}

// ---------------------------------------------------------------------------------------------
// Lineups

export type LineupRow = {
  player: string
  Weeks: number
  Started: number
  Optimal: number
  Efficiency: number // started / optimal
  "Left/wk": number
  "Bench/wk": number
  Perfect: number // weeks with the best possible lineup
  "Lineup L": number // losses the best lineup would have won
}

export function lineupEfficiency(base: PreviewBase, scope: Scope): LineupRow[] {
  return [...groupBy(base.weeks.filter(inScope(scope)), (w) => w.manager)]
    .map(([player, mine]) => {
      const started = sum(mine.map((w) => w.started))
      const best = sum(mine.map((w) => w.optimal))
      return {
        player,
        Weeks: mine.length,
        Started: round(started, 1),
        Optimal: round(best, 1),
        Efficiency: round(best ? started / best : 1, 6), // shown as a percentage, so kept precise enough to round once
        "Left/wk": round((best - started) / mine.length, 1),
        "Bench/wk": round(sum(mine.map((w) => w.bench)) / mine.length, 1),
        Perfect: mine.filter((w) => w.optimal - w.started < 0.01).length,
        "Lineup L": mine.filter((w) => w.side && !w.side.win && w.side.pf + w.optimal - w.started > w.side.pa).length,
      }
    })
    .sort((a, b) => b.Efficiency - a.Efficiency)
}

export type Blunder = {
  year: number
  short: string
  manager: string
  opponent: string | null
  benched: Choice
  started: Choice
  gain: number
  flipped: boolean // the swap alone would have turned a loss into a win
}

export function benchBlunders(base: PreviewBase, scope: Scope, n = 10): Blunder[] {
  return base.weeks
    .filter(inScope(scope))
    .flatMap((w) =>
      w.blunder
        ? [
            {
              year: w.year,
              short: w.short,
              manager: w.manager,
              opponent: w.side?.opponent ?? null,
              ...w.blunder,
              flipped: !!w.side && !w.side.win && w.blunder.gain > w.side.pa - w.side.pf,
            },
          ]
        : []
    )
    .sort((a, b) => b.gain - a.gain)
    .slice(0, n)
}

// Starters' points per week from each kind of slot
export function positionScoring(base: PreviewBase, scope: Scope) {
  const rows = [...groupBy(base.weeks.filter(inScope(scope)), (w) => w.manager)]
    .map(([manager, mine]) => ({
      manager,
      values: GROUPS.map((g) => round(mean(mine.map((w) => w.byGroup[g])), 1)),
    }))
    .sort((a, b) => a.manager.localeCompare(b.manager))
  const average = GROUPS.map((_, i) => round(mean(rows.map((r) => r.values[i])), 1))
  return { columns: [...GROUPS], rows, average }
}

export type Mvp = { name: string; position: string; points: number; starts: number }

// Each manager's top three players by points scored in their lineup
export function teamMvps(base: PreviewBase, scope: Scope) {
  return [...groupBy(base.starts.filter(inScope(scope)), (s) => s.manager)]
    .map(([manager, mine]) => {
      const total = sum(mine.map(pts))
      const players: Mvp[] = [...groupBy(mine, (s) => s.player_id)]
        .map(([id, spots]) => ({ name: base.name(id), position: base.position(id), points: round(sum(spots.map(pts)), 1), starts: spots.length }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 3)
      return { manager, total: round(total, 1), share: total ? players[0].points / total : 0, players }
    })
    .sort((a, b) => b.share - a.share)
}

// ---------------------------------------------------------------------------------------------
// Projections

export type ProjectionRow = {
  player: string
  Weeks: number
  "Actual/wk": number
  "Proj/wk": number
  "+/- per wk": number
  "Beat proj": string // weeks above / below projection
}

export function projectionRows(base: PreviewBase, scope: Scope): ProjectionRow[] {
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
export function projectedUpsets(base: PreviewBase, scope: Scope, n = 10) {
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

// ---------------------------------------------------------------------------------------------
// Draft (one season at a time)

export type DraftPickRow = {
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
  finished: number // nth at his position in season points
  value: number // drafted - finished: positive beat his draft slot
}

const shortName = (name: string) => {
  const [first, ...rest] = name.split(" ")
  return rest.length && !name.endsWith("D/ST") ? `${first[0]}. ${rest.join(" ")}` : name
}

export function draft(espn: Espn, base: PreviewBase, year: number) {
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
  const picks: DraftPickRow[] = espn.picks
    .filter((p) => p.year === year)
    .sort((a, b) => a.overall - b.overall)
    .map((p) => {
      const position = base.position(p.player_id)
      const drafted = (taken.get(position) ?? 0) + 1
      taken.set(position, drafted)
      const finish = finished.get(p.player_id) ?? finished.size + 1
      return {
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
      }
    })
  // The draft order: who picked first, second... in round 1
  const order = picks.filter((p) => p.round === 1).map((p) => p.manager)
  const rounds = [...groupBy(picks, (p) => p.round)].map(([round, ps]) => ({ round, picks: order.map((m) => ps.find((p) => p.manager === m) ?? null) }))
  const skill = picks.filter((p) => p.position !== "K" && p.position !== "D/ST")
  return {
    year,
    order,
    rounds,
    steals: [...skill].sort((a, b) => b.value - a.value || b.points - a.points).slice(0, 10),
    // Busts from the first half of the draft, where a miss costs the most
    busts: skill
      .filter((p) => p.round <= Math.ceil(rounds.length / 2))
      .sort((a, b) => a.value - b.value || a.overall - b.overall)
      .slice(0, 10),
  }
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

// ---------------------------------------------------------------------------------------------
// Roster moves

// Share of each manager's starter points from players they drafted, traded for and picked up
export function pointSources(base: PreviewBase, scope: Scope) {
  return [...groupBy(base.starts.filter(inScope(scope)), (s) => s.manager)]
    .map(([manager, mine]) => {
      const total = sum(mine.map(pts)) || 1
      const share = (o: Origin) => round((100 * sum(mine.filter((s) => base.origin(s) === o).map(pts))) / total, 1)
      return { manager, Draft: share("Draft"), Trade: share("Trade"), Pickup: share("Pickup") }
    })
    .sort((a, b) => b.Draft - a.Draft)
}

export type Pickup = { year: number; manager: string; name: string; position: string; starts: number; points: number }

export function bestPickups(base: PreviewBase, scope: Scope, n = 10): Pickup[] {
  const pickups = base.starts.filter(inScope(scope)).filter((s) => base.origin(s) === "Pickup")
  return [...groupBy(pickups, (s) => `${s.year}|${s.manager}|${s.player_id}`).values()]
    .map((spots) => ({
      year: spots[0].year,
      manager: spots[0].manager,
      name: base.name(spots[0].player_id),
      position: base.position(spots[0].player_id),
      starts: spots.length,
      points: round(sum(spots.map(pts)), 1),
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, n)
}

export type TradeSide = { manager: string; received: { name: string; position: string; points: number }[]; points: number }
export type TradeRow = { id: string; year: number; week: string; sides: TradeSide[]; winner: string | null }

// Every executed trade, and what each side's new players scored in its lineup for the rest of the
// season, playoffs included
export function tradeLedger(espn: Espn, base: PreviewBase, scope: Scope): TradeRow[] {
  const weekOf = (year: number, period: number) =>
    espn.periods.find((p) => p.year === year && p.scoring_periods.includes(period))?.week_no ?? period
  return espn.trades
    .filter(inScope(scope))
    .map((t) => {
      const sides = [...groupBy(t.items, (i) => i.to)].map(([manager, items]) => {
        const received = items.map((i) => ({
          name: base.name(i.player_id),
          position: base.position(i.player_id),
          points: round(
            sum(
              base.allStarts
                .filter((s) => s.year === t.year && s.manager === manager && s.player_id === i.player_id && s.period >= t.period)
                .map(pts)
            ),
            1
          ),
        }))
        return { manager, received, points: round(sum(received.map((r) => r.points)), 1) }
      })
      const [top, next] = [...sides].sort((a, b) => b.points - a.points)
      return { id: t.id, year: t.year, week: `W${weekOf(t.year, t.period)}`, sides, winner: next && top.points > next.points ? top.manager : null }
    })
    .sort((a, b) => b.year - a.year || b.week.localeCompare(a.week, undefined, { numeric: true }))
}

export type ActivityRow = {
  player: string
  Adds: number
  Drops: number
  Trades: number
  "Lineup moves": number
  "Pickup pts": number // starter points from players picked up
  "Pickup %": number
}

export function activity(espn: Espn, base: PreviewBase, scope: Scope): ActivityRow[] {
  const starts = groupBy(base.starts.filter(inScope(scope)), (s) => s.manager)
  return [...groupBy(espn.teams.filter(inScope(scope)), (t) => t.manager)]
    .map(([player, teams]) => {
      const mine = starts.get(player) ?? []
      const pickup = sum(mine.filter((s) => base.origin(s) === "Pickup").map(pts))
      return {
        player,
        Adds: sum(teams.map((t) => t.acquisitions)),
        Drops: sum(teams.map((t) => t.drops)),
        Trades: sum(teams.map((t) => t.trades)),
        "Lineup moves": sum(teams.map((t) => t.lineup_moves)),
        "Pickup pts": round(pickup, 1),
        "Pickup %": round((100 * pickup) / (sum(mine.map(pts)) || 1), 1),
      }
    })
    .sort((a, b) => b.Adds - a.Adds)
}
