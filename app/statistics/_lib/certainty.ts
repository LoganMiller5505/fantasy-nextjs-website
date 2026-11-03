// Exhaustive check behind every 0% and 100% on the playoff odds. The simulations only sample the
// rest of the season, so an outcome they never hit isn't necessarily impossible. Before an odds
// figure is shown as 0% or 100%, this searches every way the remaining games can go for an outcome
// that would make it wrong.
//
// Wins are searched outcome by outcome. Points for (the tiebreak) is handled exactly where it is
// locked: a team with no games left, or whose only games left are losses to the team it is tied
// with, can't overtake that team on points. Otherwise a team still playing can always overtake a
// team it's tied with on wins, since a fantasy score has no ceiling. Where several tiebreaks
// interact the search allows any combination of them, so it may call an outcome possible that a
// full points-for check would rule out, but never the reverse. The same goes if the search runs
// past its budget: everything still open counts as possible. So a 0% or 100% that survives is
// certain; one that doesn't is shown as "<1%" or ">99%".

type Game = { manager: string; opponent: string; week_no: number }

export type RaceSetup = {
  managers: string[]
  division: Map<string, string | null | undefined>
  divisions: string[]
}

// Seed s (1-based) is bit s - 1
export const seedMask = (from: number, to: number) => (to < from ? 0 : ((1 << to) - 1) & ~((1 << (from - 1)) - 1))

// Guessed seasons tried before the full search
const SAMPLES = 2_000
// Search nodes before giving up on a question (and counting what's still open as possible)
const BUDGET = 2_000_000
// States remembered by the search, to skip repeats
const MEMORY = 500_000

// For manager `m`, which of `targets` (each a mask of final seeds) some way of finishing the season
// can land in. `wins` and `pf` are the standings before `remaining` is played. `fixed` settles m's
// game in that week first, for the odds with a win or with a loss.
export function reachable(
  setup: RaceSetup,
  wins: Map<string, number>,
  pf: Map<string, number>,
  remaining: Game[],
  manager: string,
  targets: number[],
  fixed?: { week: number; win: boolean }
): boolean[] {
  const { managers, divisions } = setup
  const n = managers.length
  const k = divisions.length
  const index = new Map(managers.map((m, i) => [m, i]))
  const div = Int32Array.from(managers, (t) => {
    const d = setup.division.get(t)
    return d == null ? -1 : divisions.indexOf(d)
  })
  const divSize = new Int32Array(k)
  for (let t = 0; t < n; t++) if (div[t] >= 0) divSize[div[t]]++
  const m = index.get(manager)!
  const dm = div[m]
  const P = Float64Array.from(managers, (t) => pf.get(t) ?? 0)

  // lo: wins so far, including games settled in the search; left: games still to settle
  const lo = Int32Array.from(managers, (t) => wins.get(t) ?? 0)
  const left = new Int32Array(n)
  // What a team's settled remaining games say about its points-for: -1 none yet, 1 a win or losses
  // to two different teams (free to overtake anyone), 2 + o only losses, all to o
  const fs = new Int32Array(n).fill(-1)
  const settle = (w: number, l: number) => {
    lo[w]++
    left[w]--
    left[l]--
    fs[w] = 1
    if (fs[l] === -1) fs[l] = 2 + w
    else if (fs[l] >= 2 && fs[l] !== 2 + w) fs[l] = 1
  }

  let games = remaining.map((g) => [index.get(g.manager)!, index.get(g.opponent)!, g.week_no] as const)
  for (const [a, b] of games) {
    left[a]++
    left[b]++
  }
  if (fixed) {
    const g = games.find(([a, b, w]) => w === fixed.week && (a === m || b === m))
    if (g) {
      const o = g[0] === m ? g[1] : g[0]
      if (fixed.win) settle(m, o)
      else settle(o, m)
      games = games.filter((x) => x !== g)
    }
  }
  // m's own games first, then its division's, so the bounds tighten fastest where they matter
  const weight = ([a, b]: readonly [number, number, number]) =>
    (a === m || b === m ? 4 : 0) + (dm >= 0 ? Number(div[a] === dm) + Number(div[b] === dm) : 0)
  games.sort((x, y) => weight(y) - weight(x))

  // Seeds m could still finish in, from each team's fewest and most possible wins. Generous on
  // purpose: it only rules out branches where none of the open targets is possible.
  const bound = () => {
    const H = lo[m] + left[m]
    const L = lo[m]
    let mateCertainAbove = false
    let mateMaybeAbove = false
    let certAboveDivs = 0 // other divisions whose winner is surely above m
    let maybeAboveDivs = 0 // other divisions whose winner could be above m
    const cert = new Int32Array(k + 1) // per division (k: no division), teams surely above m
    const maybe = new Int32Array(k + 1) // teams that could finish above m
    const certDiv = new Uint8Array(k)
    const maybeDiv = new Uint8Array(k)
    for (let t = 0; t < n; t++) {
      if (t === m) continue
      const d = div[t] < 0 ? k : div[t]
      const hi = lo[t] + left[t]
      if (lo[t] > H) {
        cert[d]++
        if (d < k) certDiv[d] = 1
        if (div[t] === dm && dm >= 0) mateCertainAbove = true
      }
      if (hi >= L) {
        maybe[d]++
        if (d < k) maybeDiv[d] = 1
        if (div[t] === dm && dm >= 0) mateMaybeAbove = true
      }
    }
    for (let d = 0; d < k; d++) {
      if (d === dm) continue
      certAboveDivs += certDiv[d]
      maybeAboveDivs += maybeDiv[d]
    }
    let mask = 0
    if (dm >= 0 && !mateCertainAbove) mask |= seedMask(1 + certAboveDivs, 1 + maybeAboveDivs)
    if (dm < 0 || mateMaybeAbove) {
      let best = k + 1 + cert[k]
      let worst = k + 1 + maybe[k]
      for (let d = 0; d < k; d++) {
        best += Math.max(0, cert[d] - 1)
        worst += Math.min(maybe[d], divSize[d] - 1 - Number(d === dm))
      }
      mask |= seedMask(best, Math.min(worst, n))
    }
    return mask
  }

  // Seeds m can finish in once every game is settled
  const tied: number[] = []
  const topW = new Int32Array(k)
  const leaf = () => {
    const w = lo[m]
    topW.fill(-1)
    for (let t = 0; t < n; t++) if (div[t] >= 0 && lo[t] > topW[div[t]]) topW[div[t]] = lo[t]
    tied.length = 0
    for (let t = 0; t < n; t++) if (lo[t] === w) tied.push(t)

    // Tied teams whose order on points for is already locked: y can't overtake x
    const before = new Int32Array(tied.length) // bit j: tied[j] must finish above tied[i]
    let locked = false
    tied.forEach((y, i) => {
      tied.forEach((x, j) => {
        if (x === y || P[x] <= P[y]) return
        if (fs[y] === -1 || fs[y] === 2 + x) {
          before[i] |= 1 << j
          locked = true
        }
      })
    })
    if (locked && tied.length <= 8) return permutations(w, before)

    // Every tie can break either way
    let mask = 0
    let gtDivs = 0
    let eqDivs = 0
    for (let d = 0; d < k; d++) {
      if (d === dm) continue
      if (topW[d] > w) gtDivs++
      else if (topW[d] === w) eqDivs++
    }
    if (dm >= 0 && topW[dm] === w) mask |= seedMask(1 + gtDivs, 1 + gtDivs + eqDivs)
    const tiedIn = new Int32Array(k + 1)
    let above = 0
    for (let t = 0; t < n; t++) {
      if (t === m) continue
      if (lo[t] > w) above++
      else if (lo[t] === w) tiedIn[div[t] < 0 ? k : div[t]]++
    }
    if (dm < 0 || topW[dm] > w || tiedIn[dm] > 0) {
      let winnersAbove = 0
      let free = tiedIn[k]
      for (let d = 0; d < k; d++) {
        if (topW[d] > w) {
          winnersAbove++
          free += tiedIn[d]
        } else if (topW[d] === w) free += Math.max(0, tiedIn[d] - 1)
      }
      const gt = above - winnersAbove
      mask |= seedMask(k + 1 + gt, Math.min(n, k + 1 + gt + free))
    }
    return mask
  }

  // Every order of the tied teams that respects the locked tiebreaks
  const permutations = (w: number, before: Int32Array) => {
    let mask = 0
    const order: number[] = []
    const all = (1 << tied.length) - 1
    const place = (placed: number) => {
      if (placed === all) {
        mask |= 1 << (seedOf(w, order) - 1)
        return
      }
      for (let i = 0; i < tied.length; i++) {
        if (placed & (1 << i) || (before[i] & placed) !== before[i]) continue
        order.push(tied[i])
        place(placed | (1 << i))
        order.pop()
      }
    }
    place(0)
    return mask
  }

  // m's seed with the tied teams in `order` (best first)
  const seedOf = (w: number, order: number[]) => {
    const at = order.indexOf(m)
    const first = new Int32Array(k).fill(-1) // where each division's best tied team sits in order
    order.forEach((t, i) => {
      if (div[t] >= 0 && topW[div[t]] === w && first[div[t]] === -1) first[div[t]] = i
    })
    let winnersAbove = 0
    for (let d = 0; d < k; d++) {
      if (d === dm && first[d] === at) continue
      if (topW[d] > w || (topW[d] === w && first[d] < at)) winnersAbove++
    }
    if (dm >= 0 && first[dm] === at) return 1 + winnersAbove
    let above = at
    for (let t = 0; t < n; t++) if (lo[t] > w) above++
    return k + 1 + above - winnersAbove
  }

  const found = targets.map(() => false)
  const openSeeds = () => targets.reduce((acc, t, i) => (found[i] ? acc : acc | t), 0)
  let wanted = openSeeds()
  const record = (seeds: number) => {
    if (!(seeds & wanted)) return
    targets.forEach((t, i) => {
      if (!found[i] && t & seeds) found[i] = true
    })
    wanted = openSeeds()
  }

  // First, cheap guesses: whole seasons where every game goes to the team ranked higher in a
  // shuffled order of the managers (m tried at every place in it), and seasons of coin flips.
  // Extreme seasons like these hit most of what's possible at once; any outcome one of them hits is
  // possible, so the search below only has to settle what they miss.
  const rand = mulberry32(n * 7919 + m)
  const rank = new Int32Array(n)
  const winner = new Int32Array(games.length)
  const saved = Int32Array.from(fs)
  // Plays every game with `pick` choosing the winner, notes where m finishes, then undoes it
  const play = (pick: (a: number, b: number) => number) => {
    games.forEach(([a, b], i) => {
      winner[i] = pick(a, b)
      settle(winner[i], winner[i] === a ? b : a)
    })
    record(leaf())
    games.forEach(([a, b], i) => {
      lo[winner[i]]--
      left[a]++
      left[b]++
    })
    fs.set(saved)
  }
  const byRank = (a: number, b: number) => (rank[a] < rank[b] ? a : b)
  const coin = (a: number, b: number) => (rand() < 0.5 ? a : b)
  for (let sample = 0; sample < SAMPLES && wanted; sample++) {
    if (sample % 4 === 3) {
      play(coin)
      continue
    }
    const order = managers.map((_, t) => t).filter((t) => t !== m)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    order.splice(sample % n, 0, m)
    order.forEach((t, i) => (rank[t] = i))
    play(byRank)
  }

  // Then the full search, outcome by outcome, skipping any branch where none of the open targets is
  // possible any more
  const seen = new Map<number, Set<number>>()
  let remembered = 0
  let nodes = 0
  let aborted = false
  // Wins and tiebreak state as two numbers (each team a digit), for spotting a state seen before
  const winBase = Math.max(...Array.from(lo, (w, t) => w + left[t])) + 1
  const exact = winBase ** n < Number.MAX_SAFE_INTEGER && (n + 3) ** n < Number.MAX_SAFE_INTEGER

  const search = (depth: number) => {
    if (aborted || !wanted) return
    if (++nodes > BUDGET) {
      aborted = true
      return
    }
    if (depth === games.length) {
      record(leaf())
      return
    }
    // The same wins and tiebreak state at the same depth has the same future (the depth is implied
    // by the total wins). Only an optimisation, so it stops growing past a size.
    if (exact) {
      let wk = 0
      let fk = 0
      for (let t = 0; t < n; t++) {
        wk = wk * winBase + lo[t]
        fk = fk * (n + 3) + fs[t] + 1
      }
      let states = seen.get(wk)
      if (states?.has(fk)) return
      if (remembered < MEMORY) {
        if (!states) seen.set(wk, (states = new Set()))
        states.add(fk)
        remembered++
      }
    }

    const [a, b] = games[depth]
    const fa = fs[a]
    const fb = fs[b]
    const undo = (w: number, l: number) => {
      lo[w]--
      left[w]++
      left[l]++
      fs[a] = fa
      fs[b] = fb
    }
    settle(a, b)
    const ifA = bound()
    undo(a, b)
    settle(b, a)
    const ifB = bound()
    undo(b, a)
    // The branch that leaves more of the open targets in reach goes first
    const options =
      popcount(ifB & wanted) > popcount(ifA & wanted)
        ? [[b, a, ifB], [a, b, ifA]]
        : [[a, b, ifA], [b, a, ifB]]
    for (const [w, l, reach] of options) {
      if (!(reach & wanted)) continue
      settle(w, l)
      search(depth + 1)
      undo(w, l)
      if (aborted || !wanted) return
    }
  }

  if (wanted && bound() & wanted) search(0)
  // Out of budget: anything still open might be possible, so it counts as possible
  return found.map((f) => f || aborted)
}

// mulberry32: a small seeded PRNG, uniform on [0, 1)
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function popcount(x: number) {
  let c = 0
  while (x) {
    x &= x - 1
    c++
  }
  return c
}
