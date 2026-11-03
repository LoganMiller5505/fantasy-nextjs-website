// Roster moves after the draft: pickups, trades and the activity behind them

import type { Espn, RosterSpot } from "@/lib/espn"
import { inScope, mean, pts, type Origin, type RosterBase } from "./base"
import { groupBy, round, sum, type Scope } from "../stats"

export function pointSources(base: RosterBase, scope: Scope) {
  return [...groupBy(base.starts.filter(inScope(scope)), (s) => s.manager)]
    .map(([manager, mine]) => {
      const total = sum(mine.map(pts)) || 1
      const share = (o: Origin) => round((100 * sum(mine.filter((s) => base.origin(s) === o).map(pts))) / total, 1)
      return { manager, Draft: share("Draft"), Trade: share("Trade"), Pickup: share("Pickup") }
    })
    .sort((a, b) => b.Draft - a.Draft)
}

export type MovePlayer = { name: string; position: string; points: number }
export type MoveRow = {
  year: number
  week: string
  manager: string
  added: MovePlayer & { starts: number } // points in the adder's lineup
  dropped: (MovePlayer & { by: string[] })[] // points in other managers' lineups afterwards
  net: number
}

// Every waiver claim and free-agent add, scored as what the added player put in the adder's
// lineup less what the dropped player went on to score in rivals' lineups. Playoffs included.
export function moveRows(espn: Espn, base: RosterBase, scope: Scope): MoveRow[] {
  const starts = groupBy(base.allStarts, (s) => `${s.year}|${s.player_id}`)
  const player = (id: number, spots: RosterSpot[]) => ({ name: base.name(id), position: base.position(id), points: round(sum(spots.map(pts)), 1) })
  const rows: MoveRow[] = []
  espn.moves.forEach((m, i) => {
    if (!inScope(scope)(m)) return
    // When this manager next adds a player. An add counts until then, since that's a move of its
    // own; so does a drop, since he's theirs again.
    const readded = (id: number) =>
      espn.moves.slice(i + 1).find((o) => o.year === m.year && o.manager === m.manager && o.added === id)?.period ?? Infinity
    const until = readded(m.added)
    const mine = (starts.get(`${m.year}|${m.added}`) ?? []).filter((s) => s.manager === m.manager && s.period >= m.period && s.period < until)
    const added = { ...player(m.added, mine), starts: mine.length }
    const dropped = m.dropped.map((id) => {
      const back = readded(id)
      const elsewhere = (starts.get(`${m.year}|${id}`) ?? []).filter((s) => s.manager !== m.manager && s.period >= m.period && s.period < back)
      return { ...player(id, elsewhere), by: [...new Set(elsewhere.map((s) => s.manager))] }
    })
    rows.push({
      year: m.year,
      week: base.week(m.year, m.period),
      manager: m.manager,
      added,
      dropped,
      net: round(added.points - sum(dropped.map((d) => d.points)), 1),
    })
  })
  return rows.sort((a, b) => b.net - a.net)
}

export function pickupMoves(espn: Espn, base: RosterBase, scope: Scope, n = 10) {
  const rows = moveRows(espn, base, scope)
  return { best: rows.slice(0, n), worst: rows.slice(-n).reverse() }
}

export type TradeSide = {
  manager: string
  received: (MovePlayer & { got: number })[]
  gave: string[]
  points: number // the new players' points in this manager's lineup
  got: number // their points while on this manager's roster, started or not
  margin: number // points less what the other side's new players scored for them
}
export type TradeRow = { id: string; year: number; week: string; sides: TradeSide[]; winner: string | null }

// Every executed trade, and what each side's new players scored for it for the rest of the
// season, playoffs included
export function tradeLedger(espn: Espn, base: RosterBase, scope: Scope): TradeRow[] {
  return espn.trades
    .filter(inScope(scope))
    .map((t) => {
      const after = (spots: RosterSpot[], manager: string, id: number) =>
        spots.filter((s) => s.year === t.year && s.manager === manager && s.player_id === id && s.period >= t.period)
      const sides = [...groupBy(t.items, (i) => i.to)].map(([manager, items]) => {
        const received = items.map((i) => ({
          name: base.name(i.player_id),
          position: base.position(i.player_id),
          points: round(sum(after(base.allStarts, manager, i.player_id).map(pts)), 1),
          got: round(sum(after(base.rostered, manager, i.player_id).map(pts)), 1),
        }))
        return {
          manager,
          received,
          gave: t.items.filter((i) => i.from === manager).map((i) => base.name(i.player_id)),
          points: round(sum(received.map((r) => r.points)), 1),
          got: round(sum(received.map((r) => r.got)), 1),
          margin: 0,
        }
      })
      // Against the other side, or the average of the others in a three-way deal
      for (const s of sides) s.margin = round(s.points - mean(sides.filter((o) => o !== s).map((o) => o.points)), 1)
      const [top, next] = [...sides].sort((a, b) => b.points - a.points)
      return { id: t.id, year: t.year, week: base.week(t.year, t.period), sides, winner: next && top.points > next.points ? top.manager : null }
    })
    .sort((a, b) => b.year - a.year || b.week.localeCompare(a.week, undefined, { numeric: true }))
}

export type TradeSideRow = Omit<TradeSide, "received"> & { year: number; week: string; partners: string[]; received: string[] }

// The best and worst ends of trades: the winning sides, biggest margin first, and the losing ones
export function tradeExtremes(ledger: TradeRow[], n = 10) {
  const rows: TradeSideRow[] = ledger.flatMap((t) =>
    t.sides.map((s) => ({
      ...s,
      year: t.year,
      week: t.week,
      partners: t.sides.filter((o) => o !== s).map((o) => o.manager),
      received: s.received.map((r) => r.name),
    }))
  )
  return {
    best: rows.filter((r) => r.margin > 0).sort((a, b) => b.margin - a.margin).slice(0, n),
    worst: rows.filter((r) => r.margin < 0).sort((a, b) => a.margin - b.margin).slice(0, n),
  }
}

// Each manager's trades won and lost, by lineup points, and the net
export function tradeRecords(ledger: TradeRow[]) {
  const sides = ledger.flatMap((t) => t.sides)
  return [...groupBy(sides, (s) => s.manager)]
    .map(([manager, mine]) => ({
      manager,
      trades: mine.length,
      won: mine.filter((s) => s.margin > 0).length,
      lost: mine.filter((s) => s.margin < 0).length,
      net: round(sum(mine.map((s) => s.margin)), 1),
    }))
    .sort((a, b) => b.net - a.net)
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

export function activity(espn: Espn, base: RosterBase, scope: Scope): ActivityRow[] {
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

export type ClaimRow = {
  player: string
  Claims: number
  Won: number
  "Beaten to it": number // another team's claim on the player went first
  Failed: number // the claim broke a rule when it ran: the drop was gone, or the roster was full
  Cancelled: number
  "Win %": number
}

// Every waiver claim that ran, and how it went. Claims still pending when a season ended are left out.
export function waiverClaims(espn: Espn, base: RosterBase, scope: Scope, n = 10) {
  const claims = espn.waivers.filter(inScope(scope)).filter((c) => c.status !== "PENDING")
  const rows: ClaimRow[] = [...groupBy(claims, (c) => c.manager)]
    .map(([player, mine]) => {
      const count = (test: (status: string) => boolean) => mine.filter((c) => test(c.status)).length
      const won = count((s) => s === "EXECUTED")
      const beaten = count((s) => s === "FAILED_INVALIDPLAYERSOURCE")
      const failed = count((s) => s.startsWith("FAILED_")) - beaten
      return {
        player,
        Claims: mine.length,
        Won: won,
        "Beaten to it": beaten,
        Failed: failed,
        Cancelled: count((s) => s === "CANCELED"),
        "Win %": round((100 * won) / (won + beaten + failed || 1), 1),
      }
    })
    .sort((a, b) => b.Claims - a.Claims)
  // Players more than one team put in for the same week, and who got them
  const contested = [...groupBy(claims.filter((c) => c.player_id != null && c.status !== "CANCELED"), (c) => `${c.year}|${c.period}|${c.player_id}`).values()]
    .map((cs) => ({
      year: cs[0].year,
      week: base.week(cs[0].year, cs[0].period),
      name: base.name(cs[0].player_id!),
      claimants: [...new Set(cs.map((c) => c.manager))],
      winner: cs.find((c) => c.status === "EXECUTED")?.manager ?? null,
    }))
    .filter((c) => c.claimants.length > 1)
    .sort((a, b) => b.claimants.length - a.claimants.length || b.year - a.year || b.week.localeCompare(a.week, undefined, { numeric: true }))
    .slice(0, n)
  return { rows, contested }
}

export type MarketRow = {
  player: string
  Proposed: number
  Received: number
  Declined: number // proposals this manager turned down
  Withdrawn: number // their own proposals they cancelled
  Completed: number
  Vetoes: number // veto votes cast on others' trades
  Upholds: number
}

// The trade talk behind the trades: who proposes, who gets asked, and who votes trades down
export function tradeMarket(espn: Espn, scope: Scope): MarketRow[] {
  const events = espn.tradeEvents.filter(inScope(scope))
  const managers = [...new Set(espn.teams.filter(inScope(scope)).map((t) => t.manager))]
  const completed = espn.trades.filter(inScope(scope)).flatMap((t) => [...new Set(t.items.flatMap((i) => [i.from, i.to]))])
  const by = (type: string, manager: string, status?: string) =>
    events.filter((e) => e.type === type && e.manager === manager && (status == null || e.status === status)).length
  return managers
    .map((player) => ({
      player,
      Proposed: by("TRADE_PROPOSAL", player),
      Received: events.filter((e) => e.type === "TRADE_PROPOSAL" && e.manager !== player && e.parties.includes(player)).length,
      Declined: by("TRADE_DECLINE", player),
      Withdrawn: by("TRADE_PROPOSAL", player, "CANCELED"),
      Completed: completed.filter((m) => m === player).length,
      Vetoes: by("TRADE_VETO", player),
      Upholds: by("TRADE_UPHOLD", player),
    }))
    .sort((a, b) => b.Proposed + b.Received - (a.Proposed + a.Received) || a.player.localeCompare(b.player))
}

export type ChurnRow = {
  player: string
  Seasons: number
  "Players used": number // distinct players on the roster, per season
  Started: number // distinct players started, per season
  "Kept all season": number // on the roster every closed regular-season week, per season
}

// How much each roster turned over. All-time figures are per season.
export function rosterChurn(base: RosterBase, scope: Scope): ChurnRow[] {
  const regular = new Set(base.starts.map((s) => `${s.year}|${s.period}`))
  const spots = base.rostered.filter(inScope(scope)).filter((s) => regular.has(`${s.year}|${s.period}`))
  return [...groupBy(spots, (s) => s.manager)]
    .map(([player, mine]) => {
      const seasons = [...groupBy(mine, (s) => s.year).values()]
      const per = (f: (season: RosterSpot[]) => number) => round(mean(seasons.map(f)), 1)
      return {
        player,
        Seasons: seasons.length,
        "Players used": per((season) => new Set(season.map((s) => s.player_id)).size),
        Started: per((season) => new Set(season.filter((s) => s.starter).map((s) => s.player_id)).size),
        "Kept all season": per((season) => {
          const periods = new Set(season.map((s) => s.period)).size
          return [...groupBy(season, (s) => s.player_id).values()].filter((ps) => new Set(ps.map((s) => s.period)).size === periods).length
        }),
      }
    })
    .sort((a, b) => b["Players used"] - a["Players used"])
}

// Players who passed through the most rosters in one season, in the order they moved
export function travelers(base: RosterBase, scope: Scope, n = 10) {
  return [...groupBy(base.rostered.filter(inScope(scope)), (s) => `${s.year}|${s.player_id}`).values()]
    .map((spots) => {
      const order = [...spots].sort((a, b) => a.period - b.period)
      const managers = order.map((s) => s.manager).filter((m, i, all) => i === 0 || all[i - 1] !== m)
      return { year: spots[0].year, name: base.name(spots[0].player_id), position: base.position(spots[0].player_id), managers, teams: new Set(managers).size }
    })
    .filter((t) => t.teams > 2)
    .sort((a, b) => b.teams - a.teams || b.managers.length - a.managers.length)
    .slice(0, n)
}

export type StreamingRow = { player: string; "K used": number; "K/wk": number; "D/ST used": number; "D/ST/wk": number }

// Kickers and defenses: who streams a new one most weeks and who sets one and forgets it, and
// what each approach scored
export function streaming(base: RosterBase, scope: Scope): StreamingRow[] {
  const weeks = groupBy(base.weeks.filter(inScope(scope)), (w) => w.manager)
  return [...groupBy(base.starts.filter(inScope(scope)), (s) => s.manager)]
    .map(([player, mine]) => {
      const used = (slot: string) => new Set(mine.filter((s) => s.slot === slot).map((s) => `${s.year}|${s.player_id}`)).size
      const perWeek = (g: "K" | "D/ST") => round(mean((weeks.get(player) ?? []).map((w) => w.byGroup[g])), 1)
      return { player, "K used": used("K"), "K/wk": perWeek("K"), "D/ST used": used("D/ST"), "D/ST/wk": perWeek("D/ST") }
    })
    .sort((a, b) => b["D/ST used"] + b["K used"] - (a["D/ST used"] + a["K used"]))
}
