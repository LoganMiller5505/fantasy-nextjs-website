-- Divisions per season: the one fact the sheet doesn't hold. Runs BEFORE populate: it creates the
-- season, manager and team rows it names, and populate leaves existing rows alone.
-- 2024 had no divisions, so it isn't listed.
create temp table division_seed on commit drop as
select * from (values
  (2025, 'Matt',   'East'),  (2025, 'James',    'East'),  (2025, 'Logan',  'East'),  (2025, 'Robert', 'East'),
  (2025, 'Andy',   'North'), (2025, 'Max',      'North'), (2025, 'Landon', 'North'), (2025, 'Nick',   'North'),
  (2025, 'Dillon', 'South'), (2025, 'Whieldon', 'South'), (2025, 'Ethan',  'South'), (2025, 'Cali',   'South'),
  (2026, 'Matt',   'East'),  (2026, 'James',    'East'),  (2026, 'Logan',  'East'),  (2026, 'Robert', 'East'),
  (2026, 'Andy',   'North'), (2026, 'Max',      'North'), (2026, 'Landon', 'North'), (2026, 'Andrew', 'North'),
  (2026, 'Dillon', 'South'), (2026, 'Whieldon', 'South'), (2026, 'Ethan',  'South'), (2026, 'Brady',  'South')
) as v(year, name, division);

insert into league.season (year)
select distinct year from division_seed
on conflict (year) do nothing;

insert into league.manager (name)
select distinct name from division_seed
on conflict (name) do nothing;

insert into league.team (year, manager_id, division)
select d.year, m.manager_id, d.division
from division_seed d
join league.manager m using (name)
on conflict (year, manager_id) do update set division = excluded.division;