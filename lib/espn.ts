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
  current_rank: number | null // ESPN's projected finish now; this season only
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
  pro_team: string | null // his NFL team that week
  kickoff: number | null // his game's kickoff (epoch ms); null with no game
  kick_date: string | null // the kickoff's date in US Eastern time, "2025-09-08"
  slot_time: KickoffSlot | null
}
export const KICKOFF_SLOTS = ['Thursday', 'Sunday early', 'Sunday late', 'Sunday night', 'Monday', 'Other'] as const
export type KickoffSlot = (typeof KICKOFF_SLOTS)[number]
export type Player = { id: number; name: string; position: string; pro_team: string | null }
export type DraftPick = {
  year: number
  overall: number
  round: number
  round_pick: number
  manager: string
  player_id: number
  auto: boolean // ESPN set an auto-draft type on the pick (its values aren't documented)
}
// A player's full NFL season, whoever had him
export type SeasonPoints = { year: number; player_id: number; points: number }
export type Trade = { id: string; year: number; period: number; items: { player_id: number; from: string; to: string }[] }
// A waiver claim or free-agent add: one player in, and whoever was dropped to make room
export type Move = { id: string; year: number; period: number; manager: string; added: number; dropped: number[] }
export type SlotRule = { year: number; slot: string; count: number; starter: boolean } // bench and IR too
// One head-to-head game as ESPN has it. A playoff bye has no away team.
export type Matchup = {
  year: number
  week_no: number
  home: string
  away: string | null
  home_points: number | null
  away_points: number | null
  is_final: boolean
  tier: string // NONE, WINNERS_BRACKET, LOSERS_CONSOLATION_LADDER...
}
// ESPN's projection for a player's remaining weeks, as of the latest sync
export type RestOfSeason = { year: number; player_id: number; points: number }
export type Bye = { year: number; pro_team: string; week: number } // the NFL week (scoring period)
// Every waiver claim, whether or not it went through
export type WaiverClaim = { id: string; year: number; period: number; manager: string; status: string; player_id: number | null }
// A trade proposal, decline, acceptance or vote, by the manager whose team filed it, with every
// manager whose players were in it
export type TradeEvent = { id: string; year: number; type: string; status: string; manager: string; parties: string[] }
// A manager's starters' points in one NFL week from one kind of stat
export type StatCategory = { year: number; period: number; manager: string; category: string; points: number }
export type LeagueSeason = {
  year: number
  size: number
  playoff_teams: number
  regular_weeks: number
  scoring: string | null // PPR, HALF, STANDARD
  acquisition: string | null
  draft_type: string | null
}
export type ScoringRule = { year: number; stat: string; points: number }

export type Espn = {
  teams: EspnTeam[]
  periods: Period[]
  roster: RosterSpot[]
  players: Record<number, Player>
  picks: DraftPick[]
  seasonPoints: SeasonPoints[]
  trades: Trade[]
  moves: Move[]
  slots: SlotRule[]
  matchups: Matchup[]
  restOfSeason: RestOfSeason[]
  byes: Bye[]
  waivers: WaiverClaim[]
  tradeEvents: TradeEvent[]
  categories: StatCategory[]
  seasons: LeagueSeason[]
  scoring: ScoringRule[]
}

export async function getEspn(): Promise<Espn> {
  const [
    teams,
    periods,
    roster,
    players,
    picks,
    seasonPoints,
    tradeItems,
    moveItems,
    slots,
    matchups,
    restOfSeason,
    byes,
    waivers,
    tradeEvents,
    categories,
    seasons,
    scoring,
  ] = await Promise.all([
    sql`
      select t.season::int as year, m.name as manager, t.name, t.draft_day_projected_rank::int as draft_rank,
             nullif(t.rank_final, 0)::int as final_rank, t.acquisitions::int, t.drops::int, t.trades::int,
             t.move_to_active::int as lineup_moves, nullif(t.current_projected_rank, 0)::int as current_rank
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
             l.abbrev as slot, l.is_starter as starter, r.points::float8 as points, r.projected_points::float8 as projected,
             pt.abbrev as pro_team, (extract(epoch from g.starts_at) * 1000)::float8 as kickoff,
             to_char(g.starts_at at time zone 'America/New_York', 'YYYY-MM-DD') as kick_date,
             -- Kickoff slots in Eastern time; a London morning game is Sunday early
             case
               when g.starts_at is null then null
               when extract(isodow from g.starts_at at time zone 'America/New_York') = 4 then 'Thursday'
               when extract(isodow from g.starts_at at time zone 'America/New_York') = 1 then 'Monday'
               when extract(isodow from g.starts_at at time zone 'America/New_York') = 7 then
                 case
                   when extract(hour from g.starts_at at time zone 'America/New_York') < 15 then 'Sunday early'
                   when extract(hour from g.starts_at at time zone 'America/New_York') < 19 then 'Sunday late'
                   else 'Sunday night'
                 end
               else 'Other'
             end as slot_time
      from espn.roster_entry r
      join espn.lineup_slot l on l.slot_id = r.lineup_slot_id
      left join espn.pro_team pt on pt.pro_team_id = r.pro_team_id
      left join espn.pro_game g on g.game_id = r.game_id
      join espn.team t on t.season = r.season and t.team_id = r.team_id
      join espn.member_manager_map mm on mm.member_id = t.primary_owner
      join league.manager m using (manager_id)`,
    // Only the players some team rostered, drafted or tried to claim
    sql`
      select p.player_id as id, p.full_name as name, pos.abbrev as position, pt.abbrev as pro_team
      from espn.player p
      join espn.position pos on pos.position_id = p.default_position_id
      left join espn.pro_team pt on pt.pro_team_id = p.pro_team_id
      where exists (select from espn.roster_entry r where r.player_id = p.player_id)
         or exists (select from espn.draft_pick d where d.player_id = p.player_id)
         or exists (select from espn.transaction_item ti where ti.player_id = p.player_id)`,
    sql`
      select d.season::int as year, d.overall_pick::int as overall, d.round::int, d.round_pick::int,
             m.name as manager, d.player_id, coalesce(d.auto_draft_type_id, 0) <> 0 as auto
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
      select tx.transaction_id as id, tx.season::int as year, tx.scoring_period::int as period, m.name as manager,
             ti.type, ti.player_id
      from espn.transaction tx
      join espn.transaction_item ti using (transaction_id)
      join espn.team t on t.season = tx.season and t.team_id = tx.team_id
      join espn.member_manager_map mm on mm.member_id = t.primary_owner
      join league.manager m using (manager_id)
      where tx.type in ('FREEAGENT', 'WAIVER') and tx.status = 'EXECUTED' and ti.type in ('ADD', 'DROP')
      -- In time order. ESPN leaves processed_at empty on free-agent adds, which go through at once.
      order by coalesce(tx.processed_at, tx.proposed_at), ti.item_no`,
    sql`
      select r.season::int as year, l.abbrev as slot, r.count::int, l.is_starter as starter
      from espn.roster_slot_rule r
      join espn.lineup_slot l using (slot_id)`,
    sql`
      select mt.season::int as year, mt.matchup_period_id::int as week_no, hm.name as home, am.name as away,
             mt.home_points::float8 as home_points, mt.away_points::float8 as away_points, mt.is_final,
             mt.playoff_tier_type as tier
      from espn.matchup mt
      join espn.team ht on ht.season = mt.season and ht.team_id = mt.home_team_id
      join espn.member_manager_map hmm on hmm.member_id = ht.primary_owner
      join league.manager hm on hm.manager_id = hmm.manager_id
      left join espn.team at on at.season = mt.season and at.team_id = mt.away_team_id
      left join espn.member_manager_map amm on amm.member_id = at.primary_owner
      left join league.manager am on am.manager_id = amm.manager_id`,
    sql`
      select season::int as year, player_id, applied_total::float8 as points
      from espn.player_stat
      where stat_source = 'projected' and stat_split = 'rest_of_season'`,
    sql`
      select ps.season::int as year, pt.abbrev as pro_team, ps.bye_week::int as week
      from espn.pro_team_season ps
      join espn.pro_team pt using (pro_team_id)
      where ps.bye_week > 0`,
    sql`
      select tx.transaction_id as id, tx.season::int as year, tx.scoring_period::int as period, m.name as manager,
             tx.status,
             (select ti.player_id from espn.transaction_item ti
               where ti.transaction_id = tx.transaction_id and ti.type = 'ADD' limit 1) as player_id
      from espn.transaction tx
      join espn.team t on t.season = tx.season and t.team_id = tx.team_id
      join espn.member_manager_map mm on mm.member_id = t.primary_owner
      join league.manager m using (manager_id)
      where tx.type = 'WAIVER'`,
    sql`
      select tx.transaction_id as id, tx.season::int as year, tx.type, tx.status, m.name as manager,
             array(
               select distinct pm.name
               from espn.transaction_item ti
               join espn.team pt on pt.season = tx.season and pt.team_id in (ti.from_team_id, ti.to_team_id)
               join espn.member_manager_map pmm on pmm.member_id = pt.primary_owner
               join league.manager pm on pm.manager_id = pmm.manager_id
               where ti.transaction_id = tx.transaction_id
             ) as parties
      from espn.transaction tx
      join espn.team t on t.season = tx.season and t.team_id = tx.team_id
      join espn.member_manager_map mm on mm.member_id = t.primary_owner
      join league.manager m using (manager_id)
      where tx.type like 'TRADE%'`,
    // Starters' fantasy points by kind of stat. Kickers and defenses count whole; for everyone else
    // each stat's points go to its kind.
    sql`
      select r.season::int as year, r.scoring_period::int as period, m.name as manager,
             case
               when pos.abbrev = 'K' then 'Kicking'
               when pos.abbrev = 'D/ST' then 'Defense'
               when a.key = '53' then 'Receptions'
               when d.name ilike '%touchdown%' or d.abbrev like '%TD' then 'Touchdowns'
               when a.key in ('3', '24', '42') then 'Yards'
               when a.key in ('20', '72') then 'Turnovers'
               else 'Other'
             end as category,
             sum(a.value::float8) as points
      from espn.roster_entry r
      join espn.lineup_slot l on l.slot_id = r.lineup_slot_id and l.is_starter
      join espn.team t on t.season = r.season and t.team_id = r.team_id
      join espn.member_manager_map mm on mm.member_id = t.primary_owner
      join league.manager m using (manager_id)
      join espn.player p on p.player_id = r.player_id
      join espn.position pos on pos.position_id = p.default_position_id
      join espn.player_stat ps on ps.player_id = r.player_id and ps.season = r.season
        and ps.scoring_period = r.scoring_period and ps.stat_source = 'actual' and ps.stat_split = 'period'
      cross join jsonb_each_text(ps.applied_stats) a
      left join espn.stat_def d on d.stat_id = a.key::int
      group by 1, 2, 3, 4`,
    sql`
      select season::int as year, size::int, playoff_team_count::int as playoff_teams,
             matchup_period_count::int as regular_weeks, player_rank_type as scoring,
             acquisition_type as acquisition, draft_type
      from espn.league_season
      order by season`,
    sql`
      select r.season::int as year, coalesce(d.name, 'Stat ' || r.stat_id) as stat, r.points::float8 as points
      from espn.scoring_rule r
      left join espn.stat_def d using (stat_id)`,
  ])

  const trades = new Map<string, Trade>()
  for (const { id, year, period, player_id, from, to } of tradeItems) {
    if (!trades.has(id)) trades.set(id, { id, year, period, items: [] })
    trades.get(id)!.items.push({ player_id, from, to })
  }
  const moves = new Map<string, Move>()
  for (const { id, year, period, manager, type, player_id } of moveItems) {
    if (!moves.has(id)) moves.set(id, { id, year, period, manager, added: 0, dropped: [] })
    const move = moves.get(id)!
    if (type === 'ADD') move.added = player_id
    else move.dropped.push(player_id)
  }

  return {
    teams: teams as EspnTeam[],
    periods: periods as Period[],
    roster: roster as RosterSpot[],
    players: Object.fromEntries((players as Player[]).map((p) => [p.id, p])),
    picks: picks as DraftPick[],
    seasonPoints: seasonPoints as SeasonPoints[],
    trades: [...trades.values()],
    moves: [...moves.values()],
    slots: slots as SlotRule[],
    matchups: matchups as Matchup[],
    restOfSeason: restOfSeason as RestOfSeason[],
    byes: byes as Bye[],
    waivers: waivers as WaiverClaim[],
    tradeEvents: tradeEvents as TradeEvent[],
    categories: categories as StatCategory[],
    seasons: seasons as LeagueSeason[],
    scoring: scoring as ScoringRule[],
  }
}
