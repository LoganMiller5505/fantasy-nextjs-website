# League Schema Guide

Moves the site off the spreadsheet-shaped `source` schema (one table per tab per season) onto a small
normalized `league` schema, with as little change as possible.

**Principles**

- **Store facts, derive everything else.** The tables hold what the sheet records, plus divisions.
  Records, head-to-head, and totals are computed by the queries that show them. No views.
- **The sheet stays the source of truth.** `source` is still loaded from it and is never written to.
  `league` is filled from `source` by one re-runnable procedure, which the sheet loader calls after
  every upload.
- **Nothing speculative.** A column exists only if something reads it today (see "Left out on
  purpose" at the end).

**The files run in the order they're numbered:**

| File | Runs | What it does |
|---|---|---|
| `db/00_schema.sql` | Once | Creates the `league` schema and its tables. |
| `db/01_seed.sql` | Once per season, when divisions are set | Divisions: the one fact the sheet doesn't hold. |
| `db/02_populate.sql` | Once, and again whenever the sync logic changes | Installs the sync as `league.sync()` and runs it. The sheet loader then calls it after every upload. |

**Status.** All three files have been run end to end on synthetic data in a local Postgres 16,
including the failure cases the checks are meant to catch, with the loader's role calling the sync
through psycopg the way `upload.py` will. They have not yet been run against a copy of the real data;
step 4 does that.

---

## 1. The schema — `db/00_schema.sql`

| Table | One row per | Key |
|---|---|---|
| `manager` | person who has ever played | `manager_id` |
| `season` | season | `year` |
| `team` | manager per season (one manager's entry in one season), with their division | `(year, manager_id)` |
| `week` | matchup period, flagged if it's a playoff round and if it spans two NFL weeks | `(year, week_no)` |
| `game` | team per week: who they played and what they scored | `(year, week_no, manager_id)` |
| `power_ranking` | line of one ranker's ballot | `(year, week_no, ranker, manager_id)` |

**Games are stored one row per side.** A game between Ann and Bob is two rows in `game`: Ann's
(opponent Bob, Ann's points) and Bob's (opponent Ann, Bob's points). Points are null until played; a
bye is the absence of a row. The keys guarantee the shape of the data:

- **One game per team per week** — the primary key.
- **Both sides exist and agree** — every row must have its mirror (a self-referencing foreign key), so
  a game can't be half-stored or claim three teams. The key is checked when the transaction commits,
  which lets the sync write both sides before it's checked.
- **Real weeks and real teams** — `game` and `power_ranking` point at `week` by
  `(year, week_no)` and at `team` by `(year, manager_id)`, sharing one `year` column. So a game can't
  involve someone who wasn't in the league that season, or a week from a different season.

The one thing the keys can't express, because it spans two rows, is that both sides of a game are
scored or neither is. The sync's checks cover it.

---

## 2. Divisions — `db/01_seed.sql`

Runs before the sync. It creates the season, manager and team rows it names, with their divisions;
the sync later adds whatever else the sheet has and leaves these rows alone. Re-running it updates
divisions in place. Because it doesn't depend on the sheet, a new season's divisions can go in as soon
as they're decided. 2024 had no divisions, so it isn't listed.

Names must match the sheet's `player` column exactly. The sync's checks catch a mismatch either way:

- **A typo here** ("Dann") creates a team with no games, and the sync stops with
  `A team with no games`. Fix the name, then remove the bad rows:

  ```sql
  delete from league.team where manager_id = (select manager_id from league.manager where name = 'Dann');
  delete from league.manager where name = 'Dann';
  ```

- **A manager left out** stops the sync with `No division (add to 01_seed.sql)`.

---

## 3. The sync — `db/02_populate.sql`

The sync is a stored procedure, `league.sync()`, so the sheet loader can run it right after every
upload (step 4). `pnpm db:populate` installs the latest version and runs it once; re-run it whenever
you edit the file. The procedure runs with the rights of whoever installed it, so the loader's `andy`
role only needs permission to call it. The file grants exactly that, and `andy` can't write to
`league` any other way.

Each call runs in one transaction. In order, it:

1. **Stages** every `source.weekly_scores_<year>` and `source.schedule_<year>` tab into one long table.
   New seasons are picked up automatically.
2. **Adds missing reference rows**: managers, seasons, teams, and weeks. Regular-season week numbers
   are the column position in the schedule tab; playoff rounds are numbered after the last one. A
   `*` after a round's name in the sheet (`Playoff Round 1* PF`, `* PA`, `* Opponent`) marks it as
   spanning two NFL weeks: it sets `week.is_double_week` and is left out of the label.
3. **Syncs games.** Pairings come from the schedule (future weeks) and the scores (played weeks and
   playoffs). A pairing named on either side's row counts for both. Points are each manager's own PF,
   never the opponent's PA. Rows the sheet no longer has are deleted, but only within seasons still
   present in `source`, so a past season survives if its tabs stop being loaded.
4. **Replaces the season's power rankings.**
5. **Prints a `WARNING` line** for any row whose PA disagrees with the opponent's own PF.
6. **Checks the result.** Any failure rolls back the entire run, so a bad sheet load never reaches
   `league`; fix the sheet and upload again.

| Check fails with | Usually means |
|---|---|
| `Two opponents in one week` | The schedule and the scores disagree about a pairing. |
| `Unknown name(s) in the sheet` | A misspelled opponent in the sheet. |
| `Scored but no game` | A scored week where neither row names an opponent. |
| `Scored, but the opponent has no score` | One side of a played game is missing its PF. |
| `A team with no games` | A misspelled name in `01_seed.sql`, or in the sheet before it was fixed. |
| `No division (add to 01_seed.sql)` | A manager missing from `01_seed.sql`. |
| `Ballot not ranked 1..N` | Extra rows (e.g. notes) above the names in the power-rankings tab. |

It ends by printing a summary (teams and games per season, former managers) as `NOTICE` lines, to
compare against step 4.

**Limits that come from the sheet**

- The power-rankings tab has no season column and no rank column. The year is hardcoded in section 4
  of the file (change it each season), and a name's rank is its row position. The checks catch a
  ballot that isn't ranked 1..N, but not one whose rows were reordered. Adding both columns to the
  sheet removes the problem.
- In `weekly_scores`, a regular-season week must be named `Week <n>`. Only the schedule tab may use
  nicknames like "Opener". A nickname in `weekly_scores` stops the sync with
  `null value in column "week_no"`.

---

## 4. Run it

```bash
pnpm db:schema      # db/00_schema.sql
pnpm db:seed        # db/01_seed.sql
pnpm db:populate    # db/02_populate.sql
```

Each reads the connection string from `DB` and stops if it isn't set. Use a **direct** (unpooled)
connection. Each file runs as one transaction, so a failure leaves nothing half-applied.

**Which connection string.** The data is on `ep-shiny-unit` (the host `DATABASE_URL` and the loader
use). `DATABASE_URL_UNPOOLED` in `.env.local` points at a different, nearly empty database
(`ep-autumn-boat`), so don't use it. The direct connection to the real database is `DATABASE_URL`
with `-pooler` removed from the host:

```bash
set -a; . ./.env.local; set +a
export DB="${DATABASE_URL/-pooler/}"
```

Worth fixing `DATABASE_URL_UNPOOLED` itself at some point (in `.env.local` and in Vercel, so
`vercel env pull` doesn't undo it), but nothing here needs it.

The role in that connection string ends up owning `league` and `league.sync()`, and the sync runs
with its rights. It already reads the `source` tables the loader creates, so nothing else needs
granting.

**Rehearse on a branch.** In Neon, create a branch from the one holding `source` (call it
`league-test`), copy its direct connection string, then:

```bash
export DB='postgresql://…league-test…'
psql "$DB" -c '\dt source.*'    # sanity check: the 12 source tables

pnpm db:schema
pnpm db:seed
pnpm db:populate
pnpm db:populate                # again: proves it's re-runnable
```

If a step fails, fix the file or the sheet and re-run that step. To start over (including after any
change to `00_schema.sql`): `psql "$DB" -c 'drop schema league cascade'`, then run all three again.

**Expected output** of `db:populate`, with the sheet loaded through 2026 week 5. Each further completed
week adds 6 played games.

| Output | Expected |
|---|---|
| `WARNING` lines | One game: 2025 Playoff Round 2, Robert / Whieldon. The sheet has 186.8 in one row and 168.8 in the other; check ESPN and fix the sheet. Until then the sync uses each manager's own row. |
| teams per season | `2024: 10, 2025: 12, 2026: 12` |
| games played per season | `2024: 80, 2025: 101, 2026: 30` |
| games total / played | `265 / 211` |
| former managers | `Cali, Nick` |

These counts confirm the sync captured everything. Whether the records computed from it are right is
confirmed when the site switches over (step 5).

**Apply for real.**

```bash
set -a; . ./.env.local; set +a
export DB="${DATABASE_URL/-pooler/}"
psql "$DB" -c '\dt source.*'    # must list the 12 source tables; if not, stop: wrong database
psql "$DB" -c '\dn'             # if "league" is already listed from an earlier attempt:
                                #   psql "$DB" -c 'drop schema league cascade'
pnpm db:schema
pnpm db:seed
pnpm db:populate
```

Check the output against the table above, then delete the `league-test` branch and commit `db/`,
`docs/`, and `package.json`. The site still reads `source` at this point and is unaffected.

**Hook up the loader** (the `fantasy-neondb-convert` repo) only after this, because the new exe calls
`league.sync()` and fails if it doesn't exist yet. In `upload.py`, add `import psycopg` at the top,
then this at the end of `main()`, after the upload loop:

```python
    # STEP 3: Rebuild the league schema from the new tables. If a check finds a problem in the
    # sheet, this stops with an error and league is left as it was.
    with psycopg.connect(db, autocommit=True) as conn:
        conn.add_notice_handler(lambda diag: print(f"  {diag.severity}: {diag.message_primary}"))
        conn.execute("call league.sync()")
    print("Synced league")
```

Push to `main` so the workflow builds a new exe, and replace the old one wherever it's run.
`psycopg` is already a dependency, and the build already bundles its driver. A failed check appears
in the window as `ERROR (RaiseException): <message>`; the upload itself has already finished, so fix
the sheet and run the exe again.

**Every week**: nothing to do here. Each upload runs the sync and prints its summary and any
warnings in the loader's window; games played should go up by 6. To re-run the sync by hand (e.g.
after editing `01_seed.sql`), run `pnpm db:populate`, or `psql "$DB" -c 'call league.sync()'`.

**When a season starts:**

1. Add the season's divisions to `db/01_seed.sql` and run `pnpm db:seed`. This can happen before the
   sheet has the season.
2. Change the year in section 4 of `db/02_populate.sql`, then run `pnpm db:populate` to install it.
3. Add the year to `upload.py`'s season loop (it lists the seasons it uploads), rebuild the exe, and
   upload as usual. The sync creates the weeks and scheduled games on its own, and anyone not in the
   new season becomes a former manager automatically.

**Changing the schema later**: don't edit `00_schema.sql` once it has been applied to the real
database. Write the change as the next numbered file, run it once with `psql`, and record it here.

---

## 5. Switch the site over

Per `AGENTS.md`, read these first. This Next.js version differs from older ones, and whether
`/statistics` is prerendered at build time decides whether a weekly sync shows up without a redeploy:

- `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`

**Add `lib/league.ts`.** Two queries on top of the existing `sql` from `lib/db.ts`: the teams, and one
row per manager-and-opponent pair. The page sums the pairs into totals. Points against come from the
opponent's mirror row. Counts are cast to `int` and points to `float8` (after summing, so there's no
rounding noise) because the Neon driver returns `bigint` and `numeric` as strings.

```ts
import 'server-only'
import { sql } from '@/lib/db'

export type TeamRow = { year: number; manager: string; division: string | null }

// One row per manager per opponent they have played. Playoffs are included, as the sheet does.
export type PairRecord = {
  manager: string; opponent: string
  wins: number; losses: number
  div_wins: number; div_losses: number
  pf: number; pa: number
}

export const getTeams = () => sql`
  select t.year, m.name as manager, t.division
  from league.team t
  join league.manager m using (manager_id)
  order by t.year desc, m.name` as Promise<TeamRow[]>

// Pass a year for one season; omit it for all-time.
export const getPairRecords = (year?: number) => sql`
  select m.name as manager, o.name as opponent,
         count(*) filter (where t.points > x.points)::int                               as wins,
         count(*) filter (where t.points < x.points)::int                               as losses,
         count(*) filter (where t.points > x.points and tm.division = tp.division)::int as div_wins,
         count(*) filter (where t.points < x.points and tm.division = tp.division)::int as div_losses,
         sum(t.points)::float8 as pf, sum(x.points)::float8 as pa
  from league.game t
  join league.game     x on x.year = t.year and x.week_no = t.week_no and x.manager_id = t.opponent_id
  join league.manager  m on m.manager_id = t.manager_id
  join league.manager  o on o.manager_id = t.opponent_id
  join league.team    tm on tm.year = t.year and tm.manager_id = t.manager_id
  join league.team    tp on tp.year = t.year and tp.manager_id = t.opponent_id
  where t.points is not null and (${year ?? null}::smallint is null or t.year = ${year ?? null})
  group by m.name, o.name` as Promise<PairRecord[]>
```

**Update `app/statistics/`.** Replace the four hardcoded `source.*` queries with these, and build the
tabs, rows, and opponent columns from the teams instead of hardcoded lists:

- A cell is that pair's `wins-losses`. With no pair row, show `0-0` if the two were in the league
  together, and leave it blank if they never were, as the sheet does.
- Totals, win %, and division totals are sums over a manager's pair rows. Win % is now a number, so
  the string-to-number workaround in `sortFn_numeric` can go.

**One decision: division record.** `league` counts a division game by the divisions *that season*.
The sheet's all-time `Div Total` instead applies each manager's *latest* division to every game, so
the all-time tab will differ for managers who changed division or played in 2024, which had no
divisions.

**Verify against the sheet.** This is the only check that the records themselves are right, so be
thorough:

1. Before changing anything, screenshot every `/statistics` tab.
2. After the change, run `pnpm dev` and compare each per-season tab against its screenshot, cell by
   cell, including `Total` and `Div Total`. They should match exactly; any difference is a bug in the
   sync or a wrong division in `01_seed.sql`.
3. Compare the all-time tab. Expect differences only in `Div Total`, for the reason above.
4. Run `pnpm lint` and `pnpm build`.

Once the site no longer reads them, the sheet's derived tabs (`matchups_*`, `all_time`,
`games_played`) can stop being loaded.

---

## Left out on purpose

Each of these was considered and dropped to keep things small. Add one back when something actually
needs it.

| Left out | Why | Add it back when |
|---|---|---|
| Views | They obscured the tables; queries compute what they need. | Several pages repeat the same query. |
| An automated parity check against the sheet's derived tabs | Comparing the site to screenshots at switch-over (step 5) does the same job once, and those tabs are going away. | The sync's game logic changes. |
| A game id, or one row per game | One row per side, with mirrored rows, needs no id and lets the primary key enforce one game per team per week. | Something needs to point at a game as a whole. |
| A regular-weeks count on `season` | Would duplicate `week.is_playoff`, with nothing keeping the two in step. | Never; derive it from `week`. |
| A bracket column (championship / consolation) | Never filled in. | You want champions in the database. |
| A team name on `team` | Would duplicate `TEAMS` in `lib/power-rankings.ts`, which is what the site reads. | Team names move out of the code. |
| A `ranker` table | The three rankers fit in a check constraint. | Rankers change often. |

## Rollback

- Before the site switch: `drop schema league cascade;`. Nothing else was touched.
- After it: revert the app commit first, so the site reads `source` again, then drop the schema.
