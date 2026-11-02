import 'server-only'
import { sql } from '@/lib/db'

// Rows of the espn schema (synced from ESPN by fantasy-espn-api), with each ESPN team resolved to
// its league.manager name through espn.member_manager_map. Numerics are cast to float8 because the
// Neon driver returns numeric as strings.

export type EspnTeam = {
  year: number
  manager: string
  name: string
  draft_rank: number | null // ESPN's draft-day projected finish
  final_rank: number | null // null until the season is complete
  acquisitions: number
  drops: number
  trades: number
  lineup_moves: number
}
// A league week. It can span more than one NFL week (scoring period).
export type Period = { year: number; week_no: number; scoring_periods: number[]; is_playoff: boolean; is_final: boolean }
// One player on one team's roster for one NFL week, and what they scored there
export type RosterSpot = {
  year: number
  period: number // NFL week (scoring period)
  manager: string
  player_id: number
  slot: string // QB, RB, WR, TE, FLEX, D/ST, K, BE, IR
  starter: boolean
  points: number | null // null: no game
  projected: number | null
}
export type Player = { id: number; name: string; position: string; pro_team: string | null }
export type DraftPick = { year: number; overall: number; round: number; round_pick: number; manager: string; player_id: number }
// A player's full NFL season, whoever had him
export type SeasonPoints = { year: number; player_id: number; points: number }
export type Trade = { id: string; year: number; period: number; items: { player_id: number; from: string; to: string }[] }
export type SlotRule = { year: number; slot: string; count: number } // starting slots only

export type Espn = {
  teams: EspnTeam[]
  periods: Period[]
  roster: RosterSpot[]
  players: Record<number, Player>
  picks: DraftPick[]
  seasonPoints: SeasonPoints[]
  trades: Trade[]
  slots: SlotRule[]
}

export async function getEspn(): Promise<Espn> {
  const [teams, periods, roster, players, picks, seasonPoints, tradeItems, slots] = await Promise.all([
    sql`
      select t.season::int as year, m.name as manager, t.name, t.draft_day_projected_rank::int as draft_rank,
             nullif(t.rank_final, 0)::int as final_rank, t.acquisitions::int, t.drops::int, t.trades::int,
             t.move_to_active::int as lineup_moves
      from espn.team t
      join espn.member_manager_map mm on mm.member_id = t.primary_owner
      join league.manager m using (manager_id)`,
    // A week is final once every matchup in it is
    sql`
      select mp.season::int as year, mp.matchup_period_id::int as week_no, mp.scoring_periods::int[] as scoring_periods,
             mp.is_playoff, coalesce(bool_and(mt.is_final), false) as is_final
      from espn.matchup_period mp
      left join espn.matchup mt using (season, matchup_period_id)
      group by 1, 2, 3, 4
      order by 1, 2`,
    sql`
      select r.season::int as year, r.scoring_period::int as period, m.name as manager, r.player_id,
             l.abbrev as slot, l.is_starter as starter, r.points::float8 as points, r.projected_points::float8 as projected
      from espn.roster_entry r
      join espn.lineup_slot l on l.slot_id = r.lineup_slot_id
      join espn.team t on t.season = r.season and t.team_id = r.team_id
      join espn.member_manager_map mm on mm.member_id = t.primary_owner
      join league.manager m using (manager_id)`,
    // Only the players some team rostered or drafted
    sql`
      select p.player_id as id, p.full_name as name, pos.abbrev as position, pt.abbrev as pro_team
      from espn.player p
      join espn.position pos on pos.position_id = p.default_position_id
      left join espn.pro_team pt on pt.pro_team_id = p.pro_team_id
      where exists (select from espn.roster_entry r where r.player_id = p.player_id)
         or exists (select from espn.draft_pick d where d.player_id = p.player_id)`,
    sql`
      select d.season::int as year, d.overall_pick::int as overall, d.round::int, d.round_pick::int,
             m.name as manager, d.player_id
      from espn.draft_pick d
      join espn.team t on t.season = d.season and t.team_id = d.team_id
      join espn.member_manager_map mm on mm.member_id = t.primary_owner
      join league.manager m using (manager_id)`,
    sql`
      select season::int as year, player_id, applied_total::float8 as points
      from espn.player_stat
      where scoring_period = 0 and stat_source = 'actual' and stat_split = 'season'`,
    sql`
      select tx.transaction_id as id, tx.season::int as year, tx.scoring_period::int as period,
             ti.player_id, fm.name as "from", tm.name as "to"
      from espn.transaction tx
      join espn.transaction_item ti using (transaction_id)
      join espn.team ft on ft.season = tx.season and ft.team_id = ti.from_team_id
      join espn.member_manager_map fmm on fmm.member_id = ft.primary_owner
      join league.manager fm on fm.manager_id = fmm.manager_id
      join espn.team tt on tt.season = tx.season and tt.team_id = ti.to_team_id
      join espn.member_manager_map tmm on tmm.member_id = tt.primary_owner
      join league.manager tm on tm.manager_id = tmm.manager_id
      where tx.type = 'TRADE_ACCEPT' and tx.status = 'EXECUTED' and ti.type = 'TRADE'
      order by tx.processed_at, ti.item_no`,
    sql`
      select r.season::int as year, l.abbrev as slot, r.count::int
      from espn.roster_slot_rule r
      join espn.lineup_slot l using (slot_id)
      where l.is_starter`,
  ])

  const trades = new Map<string, Trade>()
  for (const { id, year, period, player_id, from, to } of tradeItems) {
    if (!trades.has(id)) trades.set(id, { id, year, period, items: [] })
    trades.get(id)!.items.push({ player_id, from, to })
  }

  return {
    teams: teams as EspnTeam[],
    periods: periods as Period[],
    roster: roster as RosterSpot[],
    players: Object.fromEntries((players as Player[]).map((p) => [p.id, p])),
    picks: picks as DraftPick[],
    seasonPoints: seasonPoints as SeasonPoints[],
    trades: [...trades.values()],
    slots: slots as SlotRule[],
  }
}
