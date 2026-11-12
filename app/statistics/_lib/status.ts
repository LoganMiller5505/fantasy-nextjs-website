// Clinched and eliminated, on wins alone: a tie on wins always counts as a threat, and the worst is
// assumed about who wins the other divisions. Neither can turn out wrong; they just show later than
// a full tiebreak check would (certainty.ts does that one).

export type Status = "clinched" | "eliminated" | null

// `wins`: wins so far, with any what-if picks in; `left`: each manager's games still open
export function provenStatus(
  m: string,
  {
    managers,
    wins,
    left,
    division,
    divisions,
    spots,
  }: {
    managers: string[]
    wins: Record<string, number>
    left: Record<string, number>
    division: Record<string, string | null>
    divisions: string[]
    spots: number
  }
): Status {
  const best = (o: string) => wins[o] + left[o]
  const others = managers.filter((o) => o !== m)
  const mine = division[m]
  const rivals = others.filter((o) => division[o] === mine)
  const winsDivision = mine != null && rivals.every((o) => best(o) < wins[m])
  const canWinDivision = mine != null && rivals.every((o) => wins[o] <= best(m))
  // At worst, everyone who can still match m's record finishes ahead, and so does a weaker winner
  // of every other division
  const threats = others.filter((o) => best(o) >= wins[m]).length
  const otherWinners = divisions.filter((d) => d !== mine).length
  // A division title only guarantees a spot when every division winner gets one
  if ((winsDivision && divisions.length <= spots) || threats + otherWinners < spots) return "clinched"
  // Teams already out of reach of m's best record are seeded ahead of m whenever m doesn't win its
  // division
  if (!canWinDivision && others.filter((o) => wins[o] > best(m)).length >= spots) return "eliminated"
  return null
}
