import "server-only"
import { cookies } from "next/headers"
import { AUTH_COOKIE, EDITOR_COOKIE, expectedEditorToken, expectedToken } from "@/lib/auth"

// Kept apart from lib/auth.ts so proxy.ts doesn't pull in next/headers. Both fail closed when the
// password isn't configured.

export async function isMember() {
  const token = await expectedToken()
  return !!token && (await cookies()).get(AUTH_COOKIE)?.value === token
}

export async function isEditor() {
  const token = await expectedEditorToken()
  return !!token && (await cookies()).get(EDITOR_COOKIE)?.value === token
}
