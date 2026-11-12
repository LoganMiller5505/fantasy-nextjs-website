// "Destiny" on Path to…: what winning out does for a manager's shot at an outcome. Every label comes
// from one fact, the set of final seeds the manager can still finish in if they win every game
// they have left (from the exhaustive search), rather than from assumptions about how seeds fall.
// Division winners take the top seeds whatever their record, so that set needn't be one unbroken
// run: winning out can mean 1st or 4th, never 2nd or 3rd. Seeds are bit masks: seed s is bit s - 1.

export type Destiny =
  | "controls" // winning out guarantees it
  | "floor" // winning out guarantees it or a better seed
  | "tiebreak" // winning out can only fall below it by losing a tie on wins on points for
  | "needs-help" // winning out can still fall below it outright
  | "overshoots" // winning out always finishes above it
  | "misses" // winning out can't land there, and can finish below it

// The seeds a manager can finish in after winning (or losing) out. `outright`: those reachable with
// nobody else on their number of wins. `unsure` / `outrightUnsure`: seeds the search ran out of
// budget on, included in `seeds` / `outright` to be safe but not proven possible.
export type OutFacts = { seeds: number; outright: number; unsure: number; outrightUnsure: number }

const highest = (mask: number) => 32 - Math.clz32(mask) // 1-based seed of the worst set bit
const lowest = (mask: number) => highest(mask & -mask) // 1-based seed of the best set bit

function label(target: number, seeds: number, outright: number): Destiny {
  const below = ~((1 << highest(target)) - 1) // every seed worse than the target's worst
  if ((seeds & ~target) === 0) return "controls"
  if ((seeds & target) === 0) return seeds & below ? "misses" : "overshoots"
  if ((seeds & below) === 0) return "floor"
  return (outright & below) === 0 ? "tiebreak" : "needs-help"
}

const bits = (mask: number) => {
  const out: number[] = []
  for (let b = 0; b < 31; b++) if (mask & (1 << b)) out.push(1 << b)
  return out
}

// The label for landing in `target` given what winning out can do. Null when an unsure seed could
// change the answer: every way the unsettled seeds could turn out has to give the same label.
export function classify(target: number, { seeds, outright, unsure, outrightUnsure }: OutFacts): Destiny | null {
  const open = [...bits(unsure).map((b) => ({ b, outright: false })), ...bits(outrightUnsure).map((b) => ({ b, outright: true }))]
  if (open.length > 8) return null
  const sureSeeds = seeds & ~unsure
  const sureOutright = outright & ~outrightUnsure
  let answer: Destiny | null = null
  for (let pick = 0; pick < 1 << open.length; pick++) {
    let s = sureSeeds
    let o = sureOutright
    open.forEach(({ b, outright: isOutright }, i) => {
      if (!(pick & (1 << i))) return
      if (isOutright) o |= b
      else s |= b
    })
    // An outright finish is still a finish
    const result = label(target, s | o, o)
    if (answer && result !== answer) return null
    answer = result
  }
  return answer
}

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`

// A set of final seeds in words: "1st–6th", "1st or 4th", "5th, 6th or out". Seeds past the
// playoff spots all read as "out".
export function describeSeeds(mask: number, spots: number) {
  const parts: string[] = []
  let s = 1
  while (s <= spots) {
    if (!(mask & (1 << (s - 1)))) {
      s++
      continue
    }
    let end = s
    while (end + 1 <= spots && mask & (1 << end)) end++
    if (end - s >= 2) parts.push(`${ordinal(s)}–${ordinal(end)}`)
    else for (let t = s; t <= end; t++) parts.push(ordinal(t))
    s = end + 1
  }
  if (mask >> spots) parts.push(parts.length ? "out" : "out of the playoffs")
  if (parts.length <= 1) return parts[0] ?? ""
  return `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`
}

export { highest as worstSeed, lowest as bestSeed }
