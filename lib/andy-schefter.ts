// To add a tweet: put any images in public/andy-schefter/, then add an entry to TWEETS with each
// image's real width/height (used to size it before it loads). Order doesn't matter; the feed sorts
// newest first. Counts are just for show.

export type TweetImage = { src: string, alt: string, width: number, height: number }
export type Tweet = {
  id: string
  date: string // "YYYY-MM-DDTHH:MM", shown as written (no timezone shift)
  text: string // newlines are kept; @mentions, #hashtags and links are tinted blue
  images?: TweetImage[] // up to 4
  replies: number
  retweets: number
  likes: number
  views: number
}

export const PROFILE = {
  name: 'Andy Schefter',
  handle: 'AndySchefter',
  avatar: '/andy-schefter/pfp.png',
  banner: '/andy-schefter/banner.jpg' as string | undefined, // shown at 3:1, cropped to fit
  bio: 'ESPLogaN Senior Fantasy Insider. The first to know Run It Up The Middle Enjoyers League news.',
  location: 'Auburn, AL',
  website: 'thehuddle.lmiller.io/andy-schefter',
  following: 12,
  followers: 10_000_000,
}

export const TWEETS: Tweet[] = [
  {
    id: '2026-10-30-robert-trade',
    date: '2026-10-30T09:37',
    text: '\"Come Cee Whats in my Basement, at 1-6, giving impression they are standing pat,\" sources say. \“But a long way till Dec. 2 deadline, and they are receiving calls.\"',
    replies: 1_483,
    retweets: 5_194,
    likes: 38_859,
    views: 3_218_934,
  },
  {
    id: '2026-10-29-gesicki-claimed',
    date: '2026-10-29T18:21',
    text: 'TE Mike Gesicki was claimed off waivers this past Wednesday by Come Cee Whats in my Basement, making it the fourth team in eight weeks for the vet tight end.',
    replies: 246,
    retweets: 1_192,
    likes: 8_724,
    views: 248_384,
  },
  {
    id: '2026-10-28-andrew-rookie',
    date: '2026-10-28T12:37',
    text: 'Amid struggles to find someone opposite WR Jaxon Smith-Njigba, Inside Zone x3 Aww Punts will be turning to rookie Omar Cooper Jr. this week against Big Intelligent Group Dominance.',
    replies: 127,
    retweets: 875,
    likes: 4_285,
    views: 143_850,
  },
  {
    id: '2026-10-20-whieldon-qb',
    date: '2026-10-20T09:30',
    text: 'With Jalen Hurts out for the season, Naberhood Creep will be starting backup quarterback Bo Nix this week against CRashee and Dart.',
    replies: 246,
    retweets: 1_870,
    likes: 12_600,
    views: 1_870_000,
  },
  {
    id: '2026-10-19-robert-trade',
    date: '2026-10-19T13:32',
    text: 'GM Robert Haas is reportedly working on a trade package that would involve RB Omarion Hampton, WR CeeDee Lamb, WR Mike Evans, and others to a potential buyer, per sources.',
    replies: 2_426,
    retweets: 6_870,
    likes: 42_600,
    views: 3_870_000,
  },
  {
    id: '2026-10-15-robert-fraud',
    date: '2026-10-15T19:03',
    text: '"The one certainty is that Omarion Hampton’s time with Come Cee Whats in my Basement is done.” GM Robert Haas feels comfortable enough to know he can and will trade Hampton, which is why he’ll be inactive Sunday. But no Hampton trade will be completed until after Sunday’s games are played. (Photo Credit: @LoganMiller) ',
    images: [
      { src: '/slander-gallery/RobertLosing.png', alt: 'Robert Losing', width: 2316, height: 2895 },
    ],
    replies: 1_024,
    retweets: 4_870,
    likes: 31_600,
    views: 2_870_000,
  },
  {
    id: '2026-10-06-desk-launch',
    date: '2026-10-06T08:47',
    text: 'According to league sources, per me, Andy Schefter, league executives are “fed up” with the lack of competition put forth from BIGD GM Dillon Hammell. Some execs are floating the possibility of team relegation, or potentially onboarding former GM “Autopick” Nick Tarasi in an advisory role to instill “a [more] competitive, winning culture” in the club. Some team owners such as owner/GM Whieldon Smith have pushed back on this, although league sources cite a heavy “conflict of interest” in his position.',
    images: [
      { src: '/slander-gallery/DillonRelegation.png', alt: 'Dillon Relegation', width: 2160, height: 2343 },
    ],
    replies: 312,
    retweets: 1_480,
    likes: 9_215,
    views: 1_204_000,
  },
]
