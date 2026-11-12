"use server"

import { cookies } from "next/headers"
import { AUTH_COOKIE, expectedToken } from "@/lib/auth"
import { getScenarioRace } from "../_lib/data"

// The race with a what-if's picks in (picks.ts). Server functions can be called by a direct POST,
// so this checks the site password cookie itself rather than relying on the proxy.
export async function scenarioRace(picks: string) {
  const token = await expectedToken()
  if (!token || (await cookies()).get(AUTH_COOKIE)?.value !== token) throw new Error("Unauthorized")
  if (typeof picks !== "string" || picks.length > 200) return null
  return getScenarioRace(picks)
}
