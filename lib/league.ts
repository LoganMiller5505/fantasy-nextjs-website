import 'server-only'
import { sql } from '@/lib/db'

// Rows of the league schema with manager names joined in. Points are cast to float8 because the
// Neon driver returns numeric as strings.

export type Division = 'East' | 'North' | 'South'
export type Ranker = 'Logan' | 'Andy' | 'ESPN'

export type Team = { year: number; manager: string; division: Division | null }
export type Week = { year: number; week_no: number; label: string; is_playoff: boolean; is_double_week: boolean }
// One row per team per week, both sides of every game. A bye is the absence of a row.
export type Game = { year: number; week_no: number; manager: string; opponent: string; points: number | null }
export type PowerRanking = { year: number; week_no: number; ranker: Ranker; manager: string; rank: number }

export type League = { teams: Team[]; weeks: Week[]; games: Game[]; powerRankings: PowerRanking[] }

export async function getLeague(): Promise<League> {
  const [teams, weeks, games, powerRankings] = await Promise.all([
    sql`
      select t.year::int, m.name as manager, t.division
      from league.team t
      join league.manager m using (manager_id)`,
    sql`
      select year::int, week_no::int, label, is_playoff, is_double_week
      from league.week
      order by year, week_no`,
    sql`
      select g.year::int, g.week_no::int, m.name as manager, o.name as opponent, g.points::float8 as points
      from league.game g
      join league.manager m on m.manager_id = g.manager_id
      join league.manager o on o.manager_id = g.opponent_id`,
    sql`
      select p.year::int, p.week_no::int, p.ranker, m.name as manager, p.rank::int
      from league.power_ranking p
      join league.manager m using (manager_id)`,
  ])
  return {
    teams: teams as Team[],
    weeks: weeks as Week[],
    games: games as Game[],
    powerRankings: powerRankings as PowerRanking[],
  }
}
