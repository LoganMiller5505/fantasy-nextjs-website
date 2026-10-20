create schema league;

-- Everyone who has ever played. Never deleted; "current" means on the latest season's roster.
create table league.manager (
  manager_id smallint generated always as identity primary key,
  name       text not null unique              -- matches the sheet's "player"
);

create table league.season (
  year smallint primary key
);

-- A team: one manager's entry in one season.
create table league.team (
  year       smallint not null references league.season,
  manager_id smallint not null references league.manager,
  division   text check (division in ('East', 'North', 'South')),  -- null when the season had none
  primary key (year, manager_id)
);

-- A matchup period. Regular-season weeks come first; playoff rounds are numbered after them.
create table league.week (
  year       smallint not null references league.season,
  week_no    smallint not null,
  label      text     not null,                -- 'Week 2', 'Opener', 'Playoff Round 1'
  is_playoff boolean  not null,
  is_double_week boolean not null default false,  -- a playoff round spanning two NFL weeks
  primary key (year, week_no)
);

-- One row per team per week: who they played and what they scored. Each game is two rows, one per
-- side, and each row must have its mirror. A bye is the absence of a row.
create table league.game (
  year        smallint not null,
  week_no     smallint not null,
  manager_id  smallint not null,
  opponent_id smallint not null,
  points      numeric(6,2),                    -- null until played
  primary key (year, week_no, manager_id),     -- one game per team per week
  unique (year, week_no, manager_id, opponent_id),
  foreign key (year, week_no, opponent_id, manager_id)  -- if I played you, you played me
    references league.game (year, week_no, manager_id, opponent_id)
    deferrable initially deferred,
  foreign key (year, week_no)    references league.week,
  foreign key (year, manager_id) references league.team,
  check (manager_id <> opponent_id)
);

-- One line of one ranker's ballot.
create table league.power_ranking (
  year       smallint not null,
  week_no    smallint not null,
  ranker     text     not null check (ranker in ('Logan', 'Andy', 'ESPN')),
  manager_id smallint not null,
  rank       smallint not null check (rank >= 1),
  primary key (year, week_no, ranker, manager_id),
  unique (year, week_no, ranker, rank),        -- no duplicate ranks on one ballot
  foreign key (year, week_no)    references league.week,
  foreign key (year, manager_id) references league.team
);
