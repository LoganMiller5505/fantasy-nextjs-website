-- The sync: fills league from the latest source tables. This file installs it as league.sync() and
-- runs it once; the sheet loader (upload.py) calls it after every upload. It runs in one
-- transaction: if any check fails, nothing in league changes.
create or replace procedure league.sync()
language plpgsql
security definer                       -- runs with its owner's rights; the loader only needs EXECUTE
set search_path = pg_catalog, pg_temp
as $sync$
declare
  tab  record;
  line record;
  bad  text;
begin
  -- 1. STAGE: unpivot every source.weekly_scores_<year> and source.schedule_<year> into one long
  --    table. New seasons are picked up automatically. col_pos matters: for nicknamed weeks
  --    ("Opener", "Rivalry") the week number IS the column position, and jsonb does not preserve
  --    column order.
  create temp table stg_cell (
    kind text, year smallint, player text, col_name text, col_pos int, value text
  ) on commit drop;

  for tab in
    select table_name,
           substring(table_name from '^(.*)_\d{4}$') as kind,
           right(table_name, 4)                       as yr
    from information_schema.tables
    where table_schema = 'source' and table_name ~ '^(weekly_scores|schedule)_\d{4}$'
  loop
    execute format($f$
      insert into stg_cell
      select %L, %s::smallint, t.player, e.key, c.ordinal_position, e.value
      from source.%I t
      cross join lateral jsonb_each_text(to_jsonb(t)) e
      join information_schema.columns c
        on c.table_schema = 'source' and c.table_name = %L and c.column_name = e.key
      where e.key <> 'player' and t.player is not null
    $f$, tab.kind, tab.yr, tab.table_name, tab.table_name);
  end loop;

  -- 2. REFERENCE ROWS: add what's missing, never overwrite or delete.
  insert into league.manager (name)
  select player
  from stg_cell where kind = 'weekly_scores'
  group by player
  order by min(year), player
  on conflict (name) do nothing;

  insert into league.season (year)
  select distinct year from stg_cell
  on conflict (year) do nothing;

  insert into league.team (year, manager_id)
  select distinct c.year, m.manager_id
  from stg_cell c join league.manager m on m.name = c.player
  where c.kind = 'weekly_scores'
  on conflict do nothing;

  -- Regular-season weeks: number = column position in the schedule tab, label = column name.
  insert into league.week (year, week_no, label, is_playoff)
  select year, col_pos - 1, col_name, false
  from stg_cell where kind = 'schedule'
  group by year, col_pos, col_name
  on conflict (year, week_no) do update set label = excluded.label;

  -- Playoff rounds: numbered after the regular season, in sheet column order. A "*" after the
  -- round name ("Playoff Round 1* PF") marks a round spanning two NFL weeks; it is kept out of the
  -- label. Only the PF column is read here, so each round is created once.
  insert into league.week (year, week_no, label, is_playoff, is_double_week)
  select p.year,
         r.last_week + dense_rank() over (partition by p.year order by p.col_pos),
         regexp_replace(p.col_name, '\*? PF$', ''),
         true,
         p.col_name ~ '\* PF$'
  from (select distinct year, col_name, col_pos
        from stg_cell
        where kind = 'weekly_scores' and col_name ~ '^Playoff .* PF$') p
  join (select year, max(week_no) as last_week
        from league.week where not is_playoff group by year) r on r.year = p.year
  on conflict (year, week_no) do update
    set label = excluded.label, is_double_week = excluded.is_double_week;

  -- 3. GAMES
  -- One row per manager per week, as the sheet has it. "slot" is the week's label: the column
  -- name minus " PF"/" PA"/" Opponent" and any two-week "*". Some score columns load as text, so
  -- blank cells are treated as not played.
  create temp table stg_team_week on commit drop as
  with s as (
    select year, player,
           regexp_replace(col_name, '\*? (PF|PA|Opponent)$', '')                         as slot,
           nullif(btrim(max(value) filter (where col_name ~ ' PF$')), '')::numeric        as pf,
           nullif(btrim(max(value) filter (where col_name ~ ' PA$')), '')::numeric        as pa,
           nullif(btrim(max(value) filter (where col_name ~ ' Opponent$')), '')           as opponent
    from stg_cell where kind = 'weekly_scores'
    group by year, player, regexp_replace(col_name, '\*? (PF|PA|Opponent)$', '')
  )
  select s.*,
         case when s.slot ~ '^Week \d+$' then substring(s.slot from '\d+')::smallint
              else w.week_no end as week_no
  from s
  left join league.week w on w.year = s.year and w.label = s.slot and w.is_playoff;

  -- One row per team per week, both sides of every game. Pairings come from the schedule (future
  -- weeks) and the scores (played weeks, including playoffs); a pairing named by either side
  -- counts for both. Points are each manager's own PF, never the opponent's PA.
  create temp table stg_side on commit drop as
  with pair as (
    select year, (col_pos - 1)::smallint as week_no, player, value as opponent
    from stg_cell where kind = 'schedule' and value is not null
    union
    select year, week_no, player, opponent
    from stg_team_week where opponent is not null
  ), both_ways as (
    select year, week_no, player, opponent from pair
    union
    select year, week_no, opponent, player from pair
  )
  select b.year, b.week_no, m.manager_id, o.manager_id as opponent_id, t.pf as points
  from both_ways b
  join league.manager m on m.name = b.player
  join league.manager o on o.name = b.opponent
  left join stg_team_week t on t.year = b.year and t.week_no = b.week_no and t.player = b.player;

  -- Stop with a readable message if the sheet pairs a manager with two opponents in one week
  -- (e.g. the schedule and the scores disagree). The insert below would fail less clearly.
  select string_agg(format('%s week %s %s', s.year, s.week_no, m.name), ', ') into bad
  from (select year, week_no, manager_id from stg_side
        group by year, week_no, manager_id having count(*) > 1) s
  join league.manager m using (manager_id);
  if bad is not null then raise exception 'Two opponents in one week: %', bad; end if;

  -- Remove rows the sheet no longer has -- but only inside seasons the sheet still contains.
  delete from league.game w
  where w.year in (select year from stg_side)
    and not exists (select 1 from stg_side s
                    where s.year = w.year and s.week_no = w.week_no
                      and s.manager_id = w.manager_id and s.opponent_id = w.opponent_id);

  -- Upsert: points fill in once a game has been played.
  insert into league.game (year, week_no, manager_id, opponent_id, points)
  select year, week_no, manager_id, opponent_id, points from stg_side
  on conflict (year, week_no, manager_id) do update set points = excluded.points;

  -- 4. POWER RANKINGS
  --    The tab has no season column and a team's rank is its physical row position, so both are
  --    assumptions here. Change the year below each season (or add both columns to the sheet).
  delete from league.power_ranking where year = 2026;

  insert into league.power_ranking (year, week_no, ranker, manager_id, rank)
  select 2026,
         substring(e.key from '^Week (\d+) ')::smallint,
         substring(e.key from '^Week \d+ (.+)$'),
         m.manager_id,
         p.rank_pos
  from (select row_number() over (order by ctid) as rank_pos, to_jsonb(t) as j
        from source.power_rankings t) p
  cross join lateral jsonb_each_text(p.j) e
  join league.manager m on m.name = e.value      -- also drops the sheet's notes rows
  where e.key ~ '^Week \d+ (Logan|Andy|ESPN)$';

  -- 5. WARNINGS (printed, not fatal): a row's PA disagreeing with the opponent's own PF.
  for line in
    select a.year, a.slot, a.player, a.pa, b.player as opponent, b.pf as opponent_pf
    from stg_team_week a
    join stg_team_week b on b.year = a.year and b.week_no = a.week_no and b.player = a.opponent
    where a.pf is not null and a.pa is distinct from b.pf
    order by a.year, a.week_no, a.player
  loop
    raise warning '% %: %''s PA is %, but %''s own PF is % (using each side''s own PF)',
      line.year, line.slot, line.player, line.pa, line.opponent, line.opponent_pf;
  end loop;

  -- 6. CHECKS: abort the whole sync if the result is wrong.

  -- A name the sheet uses that isn't a manager. Its games would otherwise be skipped silently.
  select string_agg(distinct format('%s %s', year, name), ', ') into bad
  from (select year, opponent as name from stg_team_week where opponent is not null
        union
        select year, value from stg_cell where kind = 'schedule' and value is not null) x
  where not exists (select 1 from league.manager m where m.name = x.name);
  if bad is not null then raise exception 'Unknown name(s) in the sheet: %', bad; end if;

  -- A manager-week with a score but no opponent anywhere in the sheet.
  select string_agg(format('%s %s %s', t.year, t.slot, t.player), ', ') into bad
  from stg_team_week t
  join league.manager m on m.name = t.player
  where t.pf is not null
    and not exists (select 1 from league.game w
                    where w.year = t.year and w.week_no = t.week_no and w.manager_id = m.manager_id);
  if bad is not null then raise exception 'Scored but no game: %', bad; end if;

  -- A game where one side has points and the other doesn't.
  select string_agg(format('%s week %s %s', w.year, w.week_no, m.name), ', ') into bad
  from league.game w
  join league.game o on o.year = w.year and o.week_no = w.week_no and o.manager_id = w.opponent_id
  join league.manager m on m.manager_id = w.manager_id
  where w.points is not null and o.points is null;
  if bad is not null then raise exception 'Scored, but the opponent has no score: %', bad; end if;

  -- A team with no games in a season that has a schedule: usually a misspelled name in
  -- 01_seed.sql, or in the sheet before it was corrected.
  select string_agg(format('%s %s', t.year, m.name), ', ') into bad
  from league.team t
  join league.manager m using (manager_id)
  where exists (select 1 from league.game w where w.year = t.year)
    and not exists (select 1 from league.game w
                    where w.year = t.year and w.manager_id = t.manager_id);
  if bad is not null then raise exception 'A team with no games: %', bad; end if;

  -- A team without a division in a season that has divisions.
  select string_agg(format('%s %s', t.year, m.name), ', ') into bad
  from league.team t
  join league.manager m using (manager_id)
  where t.division is null
    and exists (select 1 from league.team o where o.year = t.year and o.division is not null);
  if bad is not null then raise exception 'No division (add to 01_seed.sql): %', bad; end if;

  -- A ballot that isn't ranked 1..N (e.g. a notes row above the names shifted every rank).
  select string_agg(format('%s week %s %s', year, week_no, ranker), ', ') into bad
  from (select year, week_no, ranker from league.power_ranking
        group by year, week_no, ranker having min(rank) <> 1 or max(rank) <> count(*)) x;
  if bad is not null then raise exception 'Ballot not ranked 1..N: %', bad; end if;

  -- Summary, for comparing against the guide's expected numbers.
  -- Each game is stored as two rows (one per side), hence the halving.
  for line in
    select 'teams per season' as item, string_agg(year || ': ' || n, ', ' order by year) as result
    from (select year, count(*) n from league.team group by year) x
    union all
    select 'games played per season', string_agg(year || ': ' || n, ', ' order by year)
    from (select year, count(*) / 2 n from league.game where points is not null group by year) x
    union all
    select 'games total / played', count(*) / 2 || ' / ' || count(points) / 2 from league.game
    union all
    select 'former managers', coalesce(string_agg(m.name, ', ' order by m.name), 'none')
    from league.manager m
    where not exists (select 1 from league.team t
                      where t.manager_id = m.manager_id and t.year = (select max(year) from league.season))
  loop
    raise notice '%: %', line.item, line.result;
  end loop;
end;
$sync$;

-- The sheet loader connects as "andy" and only needs to call this.
revoke all on procedure league.sync() from public;
grant usage on schema league to andy;
grant execute on procedure league.sync() to andy;

call league.sync();
