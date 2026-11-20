// Tweets live in the database (content.tweet, see lib/tweets.ts) and are posted from /andy-schefter by
// whoever has TWEET_PASSWORD. This file holds the profile and the shared types.

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
