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
// full points-for check would rule out, but never the reverse. If the search runs past its
// budget, what's still open is settled by a max flow over who finishes above m instead (see the end
// of `reachable`); anything that still can't be settled counts as possible. So a 0% or 100% that
// survives is certain; one that doesn't is shown as "<1%" or ">99%".

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
// More of them when only an outright finish counts, which they hit far less often
const OUTRIGHT_SAMPLES = 20_000
// Search nodes before giving up on a question (and counting what's still open as possible)
const BUDGET = 2_000_000
// States remembered by the search, to skip repeats
const MEMORY = 500_000

// For manager `m`, which of `targets` (each a mask of final seeds) some way of finishing the season
// can land in. `wins` and `pf` are the standings before `remaining` is played. `fixed` settles m's
// game in each of those weeks first: next week's, for the odds with a win or with a loss, or all of
// them, for an example where m wins or loses out. `witnesses`, if given, gets one
// example for each target found: the winner of every game in `remaining`, in the same order.
// `outright` only counts seasons where nobody else finishes on m's number of wins, so m's seed
// doesn't depend on points for at all (for examples; never for deciding a 0% or 100%). `budget`
// caps the search, for an example that's only nice to have. `report.aborted` says whether anything
// was left unsettled, so an answer of "possible" can be told apart from "couldn't finish".
export function reachable(
  setup: RaceSetup,
  wins: Map<string, number>,
  pf: Map<string, number>,
  remaining: Game[],
  manager: string,
  targets: number[],
  {
    fixed = [],
    witnesses,
    outright = false,
    budget = BUDGET,
    report,
  }: {
    fixed?: { week: number; win: boolean }[]
    witnesses?: (string[] | null)[]
    outright?: boolean
    budget?: number
    report?: { aborted: boolean }
  } = {}
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

  // [home, away, week, place in `remaining`]
  let games = remaining.map((g, i) => [index.get(g.manager)!, index.get(g.opponent)!, g.week_no, i] as const)
  for (const [a, b] of games) {
    left[a]++
    left[b]++
  }
  const settled: { at: number; winner: number }[] = []
  for (const { week, win } of fixed) {
    const g = games.find(([a, b, w]) => w === week && (a === m || b === m))
    if (!g) continue
    const o = g[0] === m ? g[1] : g[0]
    if (win) settle(m, o)
    else settle(o, m)
    settled.push({ at: g[3], winner: win ? m : o })
    games = games.filter((x) => x !== g)
  }
  // m's own games first, then its division's, so the bounds tighten fastest where they matter
  const weight = ([a, b]: readonly [number, number, number, number]) =>
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
    if (outright) for (let t = 0; t < n; t++) if (t !== m && lo[t] === w) return 0
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
  // `winners`: who won each of `games`, for the witnesses
  const record = (seeds: number, winners: Int32Array) => {
    if (!(seeds & wanted)) return
    targets.forEach((t, i) => {
      if (found[i] || !(t & seeds)) return
      found[i] = true
      if (witnesses) {
        const names = new Array<string>(remaining.length)
        games.forEach((g, j) => (names[g[3]] = managers[winners[j]]))
        for (const s of settled) names[s.at] = managers[s.winner]
        witnesses[i] = names
      }
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
    record(leaf(), winner)
    games.forEach(([a, b], i) => {
      lo[winner[i]]--
      left[a]++
      left[b]++
    })
    fs.set(saved)
  }
  const byRank = (a: number, b: number) => (rank[a] < rank[b] ? a : b)
  const coin = (a: number, b: number) => (rand() < 0.5 ? a : b)
  for (let sample = 0; sample < (outright ? OUTRIGHT_SAMPLES : SAMPLES) && wanted; sample++) {
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

  // The winners chosen so far on the way down
  const path = new Int32Array(games.length)

  const search = (depth: number) => {
    if (aborted || !wanted) return
    if (++nodes > budget) {
      aborted = true
      return
    }
    if (depth === games.length) {
      record(leaf(), path)
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
    // The branch that leaves more of the open targets in reach goes first. Looking for an outright
    // finish, between equals the team with fewer wins wins: that levels the standings out, so nobody
    // lands on m's record, and finds those seasons far sooner (it slows the other searches down).
    const reachA = popcount(ifA & wanted)
    const reachB = popcount(ifB & wanted)
    const options =
      reachB > reachA || (outright && reachB === reachA && lo[b] < lo[a])
        ? [[b, a, ifB], [a, b, ifA]]
        : [[a, b, ifA], [b, a, ifB]]
    for (const [w, l, reach] of options) {
      if (!(reach & wanted)) continue
      settle(w, l)
      path[depth] = w
      search(depth + 1)
      undo(w, l)
      if (aborted || !wanted) return
    }
  }

  if (wanted && bound() & wanted) search(0)

  // Out of budget: settle what's still open by who finishes above m instead of game by game. For
  // each number of wins m could end on and each set of teams that could finish above it (level on
  // wins counts, the tiebreak going their way), m's seed follows from the seeding rule, and a max
  // flow says whether the remaining games can give every team a total on the right side of m's at
  // once. No feasible set: the target is out of reach. A feasible one is played through `leaf`,
  // which knows the locked tiebreaks, before it counts as found.
  // Targets left open: feasible on wins, but never confirmed (a locked tiebreak got in the way
  // each time). They count as possible, to be safe.
  const unsettled = targets.map(() => false)
  if (aborted && wanted) {
    const others = managers.map((_, t) => t).filter((t) => t !== m)
    const lower = new Int32Array(n)
    const upper = new Int32Array(n)
    const pairs = games.map(([a, b]) => [a, b] as const)
    const open = targets.map((t, i) => (found[i] ? 0 : t))
    const feasibleSet = open.map(() => false)
    for (let w = lo[m]; w <= lo[m] + left[m] && wanted; w++) {
      // Teams that can only finish above m, or only below it
      let forced = 0
      let barred = 0
      others.forEach((t, i) => {
        if (lo[t] > w || (outright && lo[t] === w)) forced |= 1 << i
        if (lo[t] + left[t] < w || (outright && lo[t] + left[t] === w)) barred |= 1 << i
      })
      if (forced & barred) continue
      for (let set = 0; set < 1 << others.length && wanted; set++) {
        if ((set & forced) !== forced || set & barred) continue
        const seed = seedAbove(set, others, div, k, dm)
        const hits = open.map((t, i) => !found[i] && (t & (1 << (seed - 1))) !== 0)
        if (!hits.some(Boolean)) continue
        lower[m] = upper[m] = w - lo[m]
        others.forEach((t, i) => {
          if (set & (1 << i)) {
            lower[t] = Math.max(0, w + Number(outright) - lo[t])
            upper[t] = left[t]
          } else {
            lower[t] = 0
            upper[t] = w - Number(outright) - lo[t]
          }
        })
        const winners = assign(pairs, lower, upper, n)
        if (!winners) continue
        hits.forEach((h, i) => h && (feasibleSet[i] = true))
        // Play it out exactly, as the search would at a leaf
        games.forEach(([a, b], i) => settle(winners[i], winners[i] === a ? b : a))
        record(leaf(), winners)
        games.forEach(([a, b], i) => {
          lo[winners[i]]--
          left[a]++
          left[b]++
        })
        fs.set(saved)
      }
    }
    open.forEach((t, i) => (unsettled[i] = t !== 0 && !found[i] && feasibleSet[i]))
  }

  if (witnesses) found.forEach((f, i) => !f && (witnesses[i] = null))
  if (report) report.aborted = unsettled.some(Boolean)
  return found.map((f, i) => f || unsettled[i])
}

// m's seed when exactly the teams in `set` (bits over `others`) finish above it: division winners
// first, then everyone else by record
function seedAbove(set: number, others: number[], div: Int32Array, k: number, dm: number) {
  const divsAbove = new Uint8Array(k)
  let above = 0
  others.forEach((t, i) => {
    if (!(set & (1 << i))) return
    above++
    if (div[t] >= 0) divsAbove[div[t]] = 1
  })
  // m tops its division: only the other divisions' winners that finish above it come first
  if (dm >= 0 && !divsAbove[dm]) {
    let winners = 0
    for (let d = 0; d < k; d++) winners += divsAbove[d]
    return 1 + winners
  }
  // Otherwise every division winner comes first, then the rest of the teams above m
  let winnersAbove = 0
  for (let d = 0; d < k; d++) winnersAbove += divsAbove[d]
  return k + 1 + above - winnersAbove
}

// A winner for every game in `games` so that each team t wins between lower[t] and upper[t] of
// them, or null if there's none: a max flow with lower bounds (games -> teams, then a super source
// and sink to carry the lower bounds)
function assign(games: readonly (readonly [number, number])[], lower: Int32Array, upper: Int32Array, n: number) {
  const G = games.length
  let need = 0
  for (let t = 0; t < n; t++) {
    if (lower[t] > upper[t] || upper[t] < 0) return null
    need += lower[t]
  }
  // Nodes: 0 super source, 1 super sink, 2 source, 3 sink, then games, then teams
  const SS = 0
  const TT = 1
  const S = 2
  const T = 3
  const team = (t: number) => 4 + G + t
  const flow = new MaxFlow(4 + G + n)
  const gameEdge: number[][] = []
  // Every game is played: a lower bound of 1 on source -> game
  flow.add(S, TT, G)
  games.forEach(([a, b], i) => {
    flow.add(SS, 4 + i, 1)
    gameEdge.push([flow.add(4 + i, team(a), 1), flow.add(4 + i, team(b), 1)])
  })
  for (let t = 0; t < n; t++) {
    if (upper[t] > lower[t]) flow.add(team(t), T, upper[t] - lower[t])
    if (lower[t]) flow.add(team(t), TT, lower[t])
  }
  if (need) flow.add(SS, T, need)
  flow.add(T, S, G + need)
  if (flow.run(SS, TT) < G + need) return null
  return Int32Array.from(games, ([a, b], i) => (flow.used(gameEdge[i][0]) ? a : b))
}

// Dinic's max flow, for the small networks above
class MaxFlow {
  private head: Int32Array
  private to: number[] = []
  private cap: number[] = []
  private next: number[] = []
  private level: Int32Array
  private iter: Int32Array
  constructor(private size: number) {
    this.head = new Int32Array(size).fill(-1)
    this.level = new Int32Array(size)
    this.iter = new Int32Array(size)
  }
  // Returns the edge's id
  add(from: number, to: number, cap: number) {
    const id = this.to.length
    this.to.push(to, from)
    this.cap.push(cap, 0)
    this.next.push(this.head[from], this.head[to])
    this.head[from] = id
    this.head[to] = id + 1
    return id
  }
  used(id: number) {
    return this.cap[id + 1] > 0
  }
  run(s: number, t: number) {
    let total = 0
    const queue = new Int32Array(this.size)
    for (;;) {
      this.level.fill(-1)
      this.level[s] = 0
      let qh = 0
      let qt = 0
      queue[qt++] = s
      while (qh < qt) {
        const v = queue[qh++]
        for (let e = this.head[v]; e !== -1; e = this.next[e]) {
          if (this.cap[e] > 0 && this.level[this.to[e]] < 0) {
            this.level[this.to[e]] = this.level[v] + 1
            queue[qt++] = this.to[e]
          }
        }
      }
      if (this.level[t] < 0) return total
      this.iter.set(this.head)
      for (let f = this.push(s, t, Infinity); f > 0; f = this.push(s, t, Infinity)) total += f
    }
  }
  private push(v: number, t: number, f: number): number {
    if (v === t) return f
    for (let e = this.iter[v]; e !== -1; e = this.iter[v] = this.next[e]) {
      const u = this.to[e]
      if (this.cap[e] <= 0 || this.level[u] !== this.level[v] + 1) continue
      const d = this.push(u, t, Math.min(f, this.cap[e]))
      if (d > 0) {
        this.cap[e] -= d
        this.cap[e ^ 1] += d
        return d
      }
    }
    return 0
  }
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
