import fs from 'node:fs'
import path from 'node:path'

export type ReplayVideo = { src: string, title: string, isReel: boolean }
export type ReplayWeek = { week: string, videos: ReplayVideo[] }

const REPLAYS_DIR = path.join(process.cwd(), 'public/weekly-replays')

// "2026-wk01-BIGD-vs-NM.mp4" -> "BIGD vs NM", "2026-wk01-all-matchups.mp4" -> reel
function toVideo(week: string, file: string): ReplayVideo {
  const name = file.replace(/\.mp4$/i, '').replace(/^\d{4}-wk\d+-/i, '')
  const isReel = name.toLowerCase() === 'all-matchups'
  const title = isReel ? 'All Matchups' : name.replace(/-vs-/i, ' vs ').replaceAll('-', ' ')
  return { src: `/weekly-replays/${week}/${file}`, title, isReel }
}

// Each numeric folder in public/weekly-replays is a week; its .mp4 files are that week's replays
export function getReplayWeeks(): ReplayWeek[] {
  if (!fs.existsSync(REPLAYS_DIR)) return []

  return fs.readdirSync(REPLAYS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => d.name)
    .toSorted((a, b) => Number(a) - Number(b))
    .map((week) => ({
      week,
      videos: fs.readdirSync(path.join(REPLAYS_DIR, week))
        .filter((f) => /\.mp4$/i.test(f))
        .map((f) => toVideo(week, f))
        .toSorted((a, b) => Number(b.isReel) - Number(a.isReel) || a.title.localeCompare(b.title)),
    }))
    .filter((w) => w.videos.length > 0)
}
