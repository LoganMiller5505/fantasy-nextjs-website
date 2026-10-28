import type { Scope } from "./stats"

// Reads ?season= from a page's search params: a year in `options`, or "all" when allowed
export function parseScope(raw: string | string[] | undefined, options: Scope[], fallback: Scope): Scope {
  const value = Array.isArray(raw) ? raw[0] : raw
  return options.find((o) => String(o) === value) ?? fallback
}
