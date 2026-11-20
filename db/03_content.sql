-- Content written on the site itself, rather than loaded from the sheet. Tweets for now; later
-- perhaps power ranking blurbs and recaps. Runs once.
create schema content;

-- One Andy Schefter tweet. The id is made by the app, so a tweet and its images can be written in
-- one transaction. Counts are just for show. Deleting only marks it, so it can be undone.
create table content.tweet (
  tweet_id  uuid      primary key,
  posted_at timestamp not null,                 -- no time zone: shown exactly as written
  text      text      not null check (length(text) <= 1000),   -- may be empty if it has images
  replies   integer   not null check (replies  >= 0),
  retweets  integer   not null check (retweets >= 0),
  likes     integer   not null check (likes    >= 0),
  views     integer   not null check (views    >= 0),
  deleted_at timestamptz                         -- set by Delete so it can be undone; purged after 7 days
);

-- Up to four images per tweet, stored as resized WebP. The id is also the image's URL, so it's
-- unguessable and can be cached forever.
create table content.tweet_image (
  image_id uuid     primary key default gen_random_uuid(),
  tweet_id uuid     not null references content.tweet on delete cascade,
  position smallint not null check (position between 0 and 3),
  alt      text     not null default '',
  width    integer  not null check (width  > 0),
  height   integer  not null check (height > 0),
  mime     text     not null check (mime in ('image/webp', 'image/gif')),
  bytes    bytea    not null,
  unique (tweet_id, position)
);

-- The text-only tweets that used to live in lib/andy-schefter.ts
insert into content.tweet (tweet_id, posted_at, text, replies, retweets, likes, views) values
  (gen_random_uuid(), '2026-10-30 09:37',
   '"Come Cee Whats in my Basement, at 1-6, giving impression they are standing pat," sources say. “But a long way till Dec. 2 deadline, and they are receiving calls."',
   1483, 5194, 38859, 3218934),
  (gen_random_uuid(), '2026-10-29 18:21',
   'TE Mike Gesicki was claimed off waivers this past Wednesday by Come Cee Whats in my Basement, making it the fourth team in eight weeks for the vet tight end.',
   246, 1192, 8724, 248384),
  (gen_random_uuid(), '2026-10-28 12:37',
   'Amid struggles to find someone opposite WR Jaxon Smith-Njigba, Inside Zone x3 Aww Punts will be turning to rookie Omar Cooper Jr. this week against Big Intelligent Group Dominance.',
   127, 875, 4285, 143850),
  (gen_random_uuid(), '2026-10-20 09:30',
   'With Jalen Hurts out for the season, Naberhood Creep will be starting backup quarterback Bo Nix this week against CRashee and Dart.',
   246, 1870, 12600, 1870000),
  (gen_random_uuid(), '2026-10-19 13:32',
   'GM Robert Haas is reportedly working on a trade package that would involve RB Omarion Hampton, WR CeeDee Lamb, WR Mike Evans, and others to a potential buyer, per sources.',
   2426, 6870, 42600, 3870000);
