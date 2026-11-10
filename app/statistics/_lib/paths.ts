// "Path to…" on the Outlook page: for each manager and each outcome (a playoff spot, a division
// title, a bye, a seed, missing out), the records the playoff-race simulations get there on and
// the remaining games that matter most for it. Odds of exactly 0% or 100% come from the
// exhaustive check in certainty.ts, like everywhere else on the page.

import { round } from "./stats"

type Game = { manager: string; opponent: string; week_no: number }

// What the simulations kept from every run
export type Runs = {
  count: number
  seed: Uint8Array // run * managers + manager: final seed, 0-based
  homeWon: Uint8Array // run * games + game: 1 if `manager` (the home side) won
}

// A game's result, packed into one number to keep the page light: 2 × its place in `games`, plus 1
// if the home side won. `unpack` turns it back.
export type PathResult = number
export const unpack = (r: PathResult) => ({ g: r >> 1, homeWon: (r & 1) === 1 })
const pack = (g: number, homeWon: boolean) => g * 2 + Number(homeWon)

export type PathOutcome = {
  key: string
  label: string
  odds: number
  // Proven either way by the exhaustive check: nothing left to show but the verdict
  state: "certain" | "impossible" | null
  // Whether any run got there
  reached: boolean
  // The manager's own remaining games, by week, with the odds after a win and after a loss
  own: { g: number; ifWin: number; ifLose: number }[]
  // Each remaining week's other game that moves these odds the most, by week, with the odds after
  // each result (none when too few runs got there to tell)
  games: { g: number; ifHome: number; ifAway: number }[]
  // Possible, but no run got there: one way it can still happen, from the exhaustive search, with
  // the final standings it leads to. `tiebreak`: the manager finishes level on wins with someone, so
  // points for has to fall right too.
  longShot: { won: number; lost: number; results: PathResult[]; tiebreak: boolean; standings: Standing[] } | null
  // The manager's final records across the runs that got there (record = wins from here on), most
  // common first; none when too few runs got there
  records: { won: number; lost: number; share: number }[]
  // Whether it's in the manager's own hands, from the exhaustive check: winning out guarantees it
  // ("controls"), winning out only falls short by losing a tie on wins on points for ("tiebreak"),
  // winning out can fall short outright ("needs-help"), or winning out overshoots it
  // ("overshoots"). Null when settled already, for missing the playoffs, or when the check couldn't
  // settle it.
  destiny: Destiny | null
  // How often the runs where the manager won out got there; null when too few runs won out
  ifWinOut: number | null
}

export type Destiny = "controls" | "tiebreak" | "needs-help" | "overshoots"

// One line of the final standings, best seed first. `tied`: level on wins with someone, so this
// place depends on points for; the order shown is one the tiebreak would need to take.
export type Standing = { manager: string; won: number; lost: number; division: string | null; tied: boolean }

export type Outcome = { key: string; label: string; seeds: number }

// Fewer runs than this reaching an outcome is too few to say which other games matter for it
const MIN_RUNS = 30

// A share as a percentage, kept off 0 and 100: those are kept for outcomes the exhaustive check proves
const percent = (share: number) => Math.min(99.9, Math.max(0.1, round(share * 100, 1)))

export function pathsTo({
  managers,
  games,
  forced = [],
  runs,
  wins,
  losses,
  outcomes,
  verify,
  destiny,
  pf,
  division,
  seedOrder,
}: {
  managers: string[]
  games: Game[]
  // What-if picks, by place in `games` (true: the home side wins). They count as already played:
  // in the record a manager starts from, and not among the games still theirs to win or lose.
  forced?: (boolean | null)[]
  runs: Runs
  wins: Map<string, number>
  losses: Map<string, number>
  // The outcomes to cover for each manager
  outcomes: (m: string) => Outcome[]
  // The odds shown for m landing in `seeds` given `hits` runs that did, and when no run did but
  // it's possible, the winner of every game in one season where it happens
  verify: (m: string, seeds: number, hits: number) => { odds: number; witness: string[] | null }
  // Whether winning out settles m landing in `seeds`, exhaustively (see Destiny)
  destiny: (m: string, seeds: number) => Destiny | null
  // Points for so far, each manager's division, and the seeding rule (wins, then the second map)
  pf: Map<string, number>
  division: Map<string, string | null | undefined>
  seedOrder: (wins: Map<string, number>, tiebreak: Map<string, number>) => string[]
}) {
  const n = managers.length
  const G = games.length
  const R = runs.count
  const homeWins = new Int32Array(G)
  for (let r = 0; r < R; r++) for (let g = 0; g < G; g++) homeWins[g] += runs.homeWon[r * G + g]

  const byManager = Object.fromEntries(
    managers.map((m, mi) => {
      const mine = (x: Game) => x.manager === m || x.opponent === m
      const own = games.flatMap((x, g) => (mine(x) && forced[g] == null ? [g] : []))
      // The picked results, as a starting record
      const pickedWon = games.filter((x, g) => mine(x) && forced[g] != null && forced[g] === (x.manager === m)).length
      const pickedLost = games.filter((x, g) => mine(x) && forced[g] != null).length - pickedWon
      // m's wins from here on, in each run
      const ownWon = Uint8Array.from({ length: R }, (_, r) =>
        own.filter((g) => (runs.homeWon[r * G + g] === 1) === (games[g].manager === m)).length
      )
      const wonOut = ownWon.filter((w) => w === own.length).length

      const paths = outcomes(m).map(({ key, label, seeds }): PathOutcome => {
        const hitRuns: number[] = []
        for (let r = 0; r < R; r++) if ((1 << runs.seed[r * n + mi]) & seeds) hitRuns.push(r)
        const hits = hitRuns.length
        const { odds, witness } = verify(m, seeds, hits)
        const state = odds === 100 ? "certain" : odds === 0 ? "impossible" : null
        const outcome: PathOutcome = {
          key,
          label,
          odds,
          state,
          reached: hits > 0,
          own: [],
          games: [],
          longShot: null,
          records: [],
          destiny: null,
          ifWinOut: null,
        }
        if (state) return outcome
        if (key !== "miss" && own.length) outcome.destiny = destiny(m, seeds)
        if (own.length && wonOut >= MIN_RUNS) {
          const reached = hitRuns.filter((r) => ownWon[r] === own.length).length
          outcome.ifWinOut = percent(reached / wonOut)
        }

        if (!hits) {
          if (witness) {
            const results = games.map((x, g) => pack(g, witness[g] === x.manager))
            const won = own.filter((g) => witness[g] === m).length
            const final = new Map(managers.map((t) => [t, wins.get(t)! + witness.filter((w) => w === t).length]))
            const tiebreak = managers.some((t) => t !== m && final.get(t) === final.get(m))
            const order = tiebreakOrder(managers, m, seeds, final, pf, seedOrder)
            const standings = order.map((t) => {
              const played = games.filter((x) => x.manager === t || x.opponent === t).length
              const won = final.get(t)!
              return {
                manager: t,
                won,
                lost: losses.get(t)! + played - (won - wins.get(t)!),
                division: division.get(t) ?? null,
                tied: managers.some((o) => o !== t && final.get(o) === won),
              }
            })
            outcome.longShot = { won, lost: own.length - won, results, tiebreak, standings }
          }
          return outcome
        }

        // How often the outcome happens after each result of each game
        const homeIn = new Int32Array(G)
        for (const r of hitRuns) for (let g = 0; g < G; g++) homeIn[g] += runs.homeWon[r * G + g]
        const swing = games
          .map((_, g) => {
            const awayWins = R - homeWins[g]
            // A side that never won this game in any run says nothing about it
            if (!homeWins[g] || !awayWins) return null
            const ifHome = homeIn[g] / homeWins[g]
            const ifAway = (hits - homeIn[g]) / awayWins
            return { g, ifHome, ifAway, gap: Math.abs(ifHome - ifAway) }
          })
          .filter((x) => x != null)
          .map((x) => x!)
        const enough = hits >= MIN_RUNS
        if (enough && own.length) {
          const byRecord = new Array<number>(own.length + 1).fill(0)
          for (const r of hitRuns) byRecord[ownWon[r]]++
          outcome.records = byRecord
            .map((count, won) => ({ won, lost: own.length - won, share: percent(count / hits) }))
            .filter((x, won) => byRecord[won] / hits >= 0.005)
            .sort((a, b) => b.share - a.share || b.won - a.won)
        }
        outcome.own = swing
          .filter(({ g }) => enough && own.includes(g))
          .sort((a, b) => games[a.g].week_no - games[b.g].week_no)
          .map(({ g, ifHome, ifAway }) => {
            const home = games[g].manager === m
            return { g, ifWin: percent(home ? ifHome : ifAway), ifLose: percent(home ? ifAway : ifHome) }
          })
        const elsewhere = swing.filter(({ g, gap }) => !own.includes(g) && gap > 0.005).sort((a, b) => b.gap - a.gap)
        // The other game that moves the odds most in each week, in week order
        const weekly = new Map<number, (typeof elsewhere)[number]>()
        if (enough) for (const x of elsewhere) if (!weekly.has(games[x.g].week_no)) weekly.set(games[x.g].week_no, x)
        outcome.games = [...weekly]
          .sort(([a], [b]) => a - b)
          .map(([, { g, ifHome, ifAway }]) => ({ g, ifHome: percent(ifHome), ifAway: percent(ifAway) }))

        return outcome
      })
      return [m, { wins: wins.get(m)! + pickedWon, losses: losses.get(m)! + pickedLost, outcomes: paths }]
    })
  )

  return { games: games.map((g) => ({ week: `W${g.week_no}`, home: g.manager, away: g.opponent })), byManager }
}

export type Paths = ReturnType<typeof pathsTo>

// The seeding for final `wins`, with teams level on wins put in an order points for could still
// take that lands m in `seeds`. Tries m at every place in its tied group with every tied group
// shuffled (from a fixed seed, so the page doesn't change between builds); falls back to points for
// so far.
function tiebreakOrder(
  managers: string[],
  m: string,
  seeds: number,
  wins: Map<string, number>,
  pf: Map<string, number>,
  seedOrder: (wins: Map<string, number>, tiebreak: Map<string, number>) => string[]
) {
  const lands = (order: string[]) => ((1 << order.indexOf(m)) & seeds) !== 0
  const byPf = seedOrder(wins, pf)
  if (lands(byPf)) return byPf
  const groups = [...new Set(managers.map((t) => wins.get(t)!))]
    .map((w) => managers.filter((t) => wins.get(t) === w))
    .filter((g) => g.length > 1)
  if (!groups.length) return byPf
  let state = 12345
  const rand = () => ((state = (Math.imul(state, 1103515245) + 12345) >>> 0) / 4294967296)
  for (let attempt = 0; attempt < 5000; attempt++) {
    const p = new Map(pf)
    for (const group of groups) {
      const order = group.slice()
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      // m's place in its own group steps through every position in turn
      if (order.includes(m)) {
        order.splice(order.indexOf(m), 1)
        order.splice(attempt % group.length, 0, m)
      }
      order.forEach((t, i) => p.set(t, 1e9 - i))
    }
    const seeded = seedOrder(wins, p)
    if (lands(seeded)) return seeded
  }
  return byPf
}
