// Derivations for the playoffs page. Everything counts championship-bracket games only (see
// seasonResults in stats.ts), except the regular season vs playoffs comparison, which is
// playoffRisers in stats.ts.

import type { League } from "@/lib/league"
import { brackets } from "./more-stats"
import { groupBy, pct, record, round, sum, type SeasonResult, type Side } from "./stats"

export type Finish = { year: number; manager: string; seed: number; place: number; label: string }
export type BracketGame = {
  year: number
  round: string
  double: boolean
  winner: string
  winnerSeed: number
  winnerPf: number
  loser: string
  loserSeed: number
  loserPf: number
  margin: number
}

export function playoffHistory(league: League, sides: Side[], results: SeasonResult[]) {
  const seasons = brackets(league, sides, results).sort((a, b) => a.year - b.year)
  const finishes: Finish[] = []
  const games: BracketGame[] = []
  const byes: { year: number; manager: string }[] = []

  for (const b of seasons) {
    const r = results.find((x) => x.year === b.year)!
    const seed = new Map<string, number>()
    const out = new Map<string, { place: number; label: string }>()
    b.rounds.forEach((stage, i) => {
      for (const bye of stage.byes) {
        seed.set(bye.manager, bye.seed)
        byes.push({ year: b.year, manager: bye.manager })
      }
      for (const slots of stage.games) {
        const [winner, loser] = slots[0].won ? slots : [slots[1], slots[0]]
        for (const s of slots) seed.set(s.manager, s.seed)
        games.push({
          year: b.year,
          round: stage.label,
          double: stage.double,
          winner: winner.manager,
          winnerSeed: winner.seed,
          winnerPf: winner.pf,
          loser: loser.manager,
          loserSeed: loser.seed,
          loserPf: loser.pf,
          margin: round(winner.pf - loser.pf),
        })
        // Earlier exits rank lower; the final four are placed 1–4 below
        out.set(loser.manager, { place: 5 + (b.rounds.length - 1 - i), label: `Out in ${stage.label}` })
      }
    })
    const placed: [string | null, number, string][] = [
      [r.champion, 1, "Champion"],
      [r.runnerUp, 2, "Runner-up"],
      [r.third, 3, "3rd"],
      [b.third?.find((s) => !s.won)?.manager ?? null, 4, "4th"],
    ]
    for (const [m, place, label] of placed) if (m) out.set(m, { place, label })
    for (const [manager, o] of out) finishes.push({ year: b.year, manager, seed: seed.get(manager)!, ...o })
  }

  return { years: seasons.map((s) => s.year), finishes, games, byes }
}

type History = ReturnType<typeof playoffHistory>

// ---------------------------------------------------------------------------------------------
// One row per manager who has played a finished season

export type ResumeRow = {
  player: string
  Seasons: number
  Apps: number
  Titles: number
  Finals: number
  Podiums: number
  "Bracket W-L": string
  "Win%": number
  Byes: number
  "Avg seed": number | null
  Best: string
  _best: number
}

export function playoffResumes(league: League, history: History): ResumeRow[] {
  const finished = new Set(history.years)
  return [...groupBy(league.teams.filter((t) => finished.has(t.year)), (t) => t.manager)]
    .map(([player, teams]) => {
      const mine = history.finishes.filter((f) => f.manager === player)
      const w = history.games.filter((g) => g.winner === player).length
      const l = history.games.filter((g) => g.loser === player).length
      const best = mine.reduce<Finish | null>((a, f) => (!a || f.place < a.place ? f : a), null)
      return {
        player,
        Seasons: teams.length,
        Apps: mine.length,
        Titles: mine.filter((f) => f.place === 1).length,
        Finals: mine.filter((f) => f.place <= 2).length,
        Podiums: mine.filter((f) => f.place <= 3).length,
        "Bracket W-L": record(w, l),
        "Win%": round(pct(w, l), 3),
        Byes: history.byes.filter((b) => b.manager === player).length,
        "Avg seed": mine.length ? round(sum(mine.map((f) => f.seed)) / mine.length, 1) : null,
        Best: best ? (best.place <= 4 ? `${best.label} (${best.year})` : `Made it (${best.year})`) : "—",
        _best: best?.place ?? 99,
      }
    })
    .sort((a, b) => b.Titles - a.Titles || b.Finals - a.Finals || b.Apps - a.Apps || a._best - b._best)
}

// ---------------------------------------------------------------------------------------------
// Headline numbers

export function playoffHeadlines(league: League, history: History, resumes: ResumeRow[]) {
  const upsets = history.games.filter((g) => g.winnerSeed > g.loserSeed).sort((a, b) => b.winnerSeed - b.loserSeed - (a.winnerSeed - a.loserSeed))
  const closest = [...history.games].sort((a, b) => a.margin - b.margin)[0]
  const mostTitles = Math.max(...resumes.map((r) => r.Titles))
  const mostApps = Math.max(...resumes.map((r) => r.Apps))
  const bestRecord = resumes
    .filter((r) => r["Bracket W-L"].split("-").map(Number).reduce((a, b) => a + b) >= 2)
    .sort((a, b) => b["Win%"] - a["Win%"] || b.Apps - a.Apps)[0]

  // Finished seasons in a row without a playoff spot, counting back from the latest, for
  // managers still in the league
  const current = Math.max(...league.teams.map((t) => t.year))
  const active = league.teams.filter((t) => t.year === current).map((t) => t.manager)
  const years = [...history.years].sort((a, b) => b - a)
  const droughts = active
    .map((manager) => {
      let length = 0
      for (const y of years) {
        if (!league.teams.some((t) => t.year === y && t.manager === manager)) break
        if (history.finishes.some((f) => f.year === y && f.manager === manager)) break
        length++
      }
      return { manager, length }
    })
    .sort((a, b) => b.length - a.length)

  return {
    mostTitles: { count: mostTitles, managers: resumes.filter((r) => r.Titles === mostTitles).map((r) => r.player) },
    mostApps: { count: mostApps, managers: resumes.filter((r) => r.Apps === mostApps).map((r) => r.player) },
    bestRecord,
    biggestUpset: upsets[0] ?? null,
    closest,
    drought: droughts[0]?.length ? droughts.filter((d) => d.length === droughts[0].length) : [],
    upsets,
  }
}

// ---------------------------------------------------------------------------------------------
// Seed by season: who held each seed and how far they went

export function seedTable(history: History) {
  const seeds = [...new Set(history.finishes.map((f) => f.seed))].sort((a, b) => a - b)
  return seeds.map((seed) => {
    const held = history.finishes.filter((f) => f.seed === seed)
    return {
      seed,
      bySeason: Object.fromEntries(history.years.map((y) => [y, held.find((f) => f.year === y) ?? null])) as Record<number, Finish | null>,
      titles: held.filter((f) => f.place === 1).length,
      record: record(
        history.games.filter((g) => g.winnerSeed === seed).length,
        history.games.filter((g) => g.loserSeed === seed).length
      ),
    }
  })
}
