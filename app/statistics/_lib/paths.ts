// "Path to…" on the Outlook page: for each manager and each outcome (a playoff spot, a division
// title, a bye, a seed, missing out), the most common ways the playoff-race simulations get there
// and the remaining games that matter most for it. Odds of exactly 0% or 100% come from the
// exhaustive check in certainty.ts, like everywhere else on the page.

import { round, sum } from "./stats"

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
  // The most common ways the runs got there: the manager's record over the remaining games and
  // the results of the most decisive other games (none when it's too rare to tell which they are)
  scenarios: { share: number; chance: number; won: number; lost: number; results: PathResult[] }[]
  // The manager's own remaining games, by week, with the odds after a win and after a loss
  own: { g: number; ifWin: number; ifLose: number }[]
  // The other remaining games that move these odds the most, with the odds after each result
  // (none when too few runs got there to tell)
  games: { g: number; ifHome: number; ifAway: number }[]
  // Possible, but no run got there: one way it can still happen, from the exhaustive search, with
  // the final standings it leads to. `tiebreak`: the manager finishes level on wins with someone, so
  // points for has to fall right too.
  longShot: { won: number; lost: number; results: PathResult[]; tiebreak: boolean; standings: Standing[] } | null
}

// One line of the final standings, best seed first. `tied`: level on wins with someone, so this
// place depends on points for; the order shown is one the tiebreak would need to take.
export type Standing = { manager: string; won: number; lost: number; division: string | null; tied: boolean }

export type Outcome = { key: string; label: string; seeds: number }

const KEY_GAMES = 6
const SCENARIO_GAMES = 3
const SCENARIOS = 5
// Fewer runs than this reaching an outcome is too few to say which other games matter for it
const MIN_RUNS = 30

// A share as a percentage, kept off 0 and 100: those are kept for outcomes the exhaustive check proves
const percent = (share: number) => Math.min(99.9, Math.max(0.1, round(share * 100, 1)))

export function pathsTo({
  managers,
  games,
  runs,
  wins,
  losses,
  outcomes,
  verify,
  pf,
  division,
  seedOrder,
}: {
  managers: string[]
  games: Game[]
  runs: Runs
  wins: Map<string, number>
  losses: Map<string, number>
  // The outcomes to cover for each manager
  outcomes: (m: string) => Outcome[]
  // The odds shown for m landing in `seeds` given `hits` runs that did, and when no run did but
  // it's possible, the winner of every game in one season where it happens
  verify: (m: string, seeds: number, hits: number) => { odds: number; witness: string[] | null }
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
      const own = games.flatMap((x, g) => (x.manager === m || x.opponent === m ? [g] : []))
      const ownWins = (r: number) => own.filter((g) => (runs.homeWon[r * G + g] === 1) === (games[g].manager === m)).length

      const paths = outcomes(m).map(({ key, label, seeds }): PathOutcome => {
        const hitRuns: number[] = []
        for (let r = 0; r < R; r++) if ((1 << runs.seed[r * n + mi]) & seeds) hitRuns.push(r)
        const hits = hitRuns.length
        const { odds, witness } = verify(m, seeds, hits)
        const state = odds === 100 ? "certain" : odds === 0 ? "impossible" : null
        const outcome: PathOutcome = { key, label, odds, state, scenarios: [], own: [], games: [], longShot: null }
        if (state) return outcome

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
        outcome.own = swing
          .filter(({ g }) => enough && own.includes(g))
          .sort((a, b) => games[a.g].week_no - games[b.g].week_no)
          .map(({ g, ifHome, ifAway }) => {
            const home = games[g].manager === m
            return { g, ifWin: percent(home ? ifHome : ifAway), ifLose: percent(home ? ifAway : ifHome) }
          })
        const elsewhere = swing.filter(({ g, gap }) => !own.includes(g) && gap > 0.005).sort((a, b) => b.gap - a.gap)
        outcome.games = elsewhere.slice(0, enough ? KEY_GAMES : 0).map(({ g, ifHome, ifAway }) => ({
          g,
          ifHome: percent(ifHome),
          ifAway: percent(ifAway),
        }))

        // Group the runs that got there by the manager's record and the most decisive other games
        // As many decisive games as still leave the top paths covering at least half the runs that
        // got there: a broad outcome splits into too many thin paths otherwise
        const candidates = elsewhere.slice(0, enough ? SCENARIO_GAMES : 0).map(({ g }) => g)
        const group = (decisive: number[]) => {
          const groups = new Map<number, { won: number; bits: number; count: number }>()
          for (const r of hitRuns) {
            const won = ownWins(r)
            let bits = 0
            decisive.forEach((g, i) => (bits |= runs.homeWon[r * G + g] << i))
            const id = won * 8 + bits
            const found = groups.get(id)
            if (found) found.count++
            else groups.set(id, { won, bits, count: 1 })
          }
          return [...groups.values()].sort((a, b) => b.count - a.count || b.won - a.won).slice(0, SCENARIOS)
        }
        let decisive = candidates
        let top = group(decisive)
        while (decisive.length && sum(top.map((t) => t.count)) < hits / 2) {
          decisive = decisive.slice(0, -1)
          top = group(decisive)
        }
        outcome.scenarios = top.map(({ won, bits, count }) => ({
            share: percent(count / hits),
            chance: percent(count / R),
            won,
            lost: own.length - won,
            results: decisive.map((g, i) => pack(g, ((bits >> i) & 1) === 1)),
          }))
        return outcome
      })
      return [m, { wins: wins.get(m)!, losses: losses.get(m)!, outcomes: paths }]
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
