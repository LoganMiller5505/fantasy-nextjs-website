// What-if picks: the winner of any of the remaining regular-season games, in schedule order
// (`paths.games`). Sent and kept in the URL as one letter per game: h (home side wins), a (away
// side wins), - (open).

export type Pick = "home" | "away" | null

const LETTER = { home: "h", away: "a" } as const

export const encodePicks = (picks: Pick[]) => picks.map((p) => (p ? LETTER[p] : "-")).join("")

// Anything that isn't a pick string for exactly `count` games reads as no picks
export function decodePicks(text: string | null | undefined, count: number): Pick[] {
  if (!text || text.length !== count || !/^[ha-]+$/.test(text)) return new Array<Pick>(count).fill(null)
  return [...text].map((c) => (c === "h" ? "home" : c === "a" ? "away" : null))
}

// For the race model: true when the home side wins
export const toForced = (picks: Pick[]) => picks.map((p) => (p == null ? null : p === "home"))
