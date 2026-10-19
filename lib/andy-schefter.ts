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
  banner: undefined as string | undefined, // e.g. '/andy-schefter/banner.jpg' (3:1 works best)
  bio: 'ESPLogaN Senior Fantasy Insider. The first to know Run It Up The Middle Enjoyers League news.',
  location: 'Auburn, AL',
  website: 'thehuddle.lmiller.io/andy-schefter',
  following: 12,
  followers: 10_000_000,
}

export const TWEETS: Tweet[] = [
  {
    id: '2026-10-19-desk-launch',
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
  {
    id: '2026-10-19-robert-fraud',
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
]
