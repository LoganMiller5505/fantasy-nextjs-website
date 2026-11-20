import "server-only"
import { cookies } from "next/headers"
import { AUTH_COOKIE, POSTER_COOKIE, expectedPosterToken, expectedToken } from "@/lib/auth"

// Kept apart from lib/auth.ts so proxy.ts doesn't pull in next/headers. Both fail closed when the
// password isn't configured.

export async function isMember() {
  const token = await expectedToken()
  return !!token && (await cookies()).get(AUTH_COOKIE)?.value === token
}

export async function isPoster() {
  const token = await expectedPosterToken()
  return !!token && (await cookies()).get(POSTER_COOKIE)?.value === token
}
