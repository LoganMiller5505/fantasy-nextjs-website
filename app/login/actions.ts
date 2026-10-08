"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_COOKIE, expectedToken } from "@/lib/auth"

// Only allow same-site paths so the form can't be used as an open redirect
function safePath(from: FormDataEntryValue | null) {
  // Browsers treat "\" like "/", so "/\evil.com" would otherwise escape to another host
  if (typeof from !== "string" || /[\\\x00-\x1f]/.test(from) || !from.startsWith("/") || from.startsWith("//")) {
    return "/"
  }
  const url = new URL(from, "http://localhost")
  if (url.origin !== "http://localhost") return "/"
  // Normalizing can reintroduce "//" (e.g. "/.//evil.com"), so collapse leading slashes
  return url.pathname.replace(/^\/+/, "/") + url.search + url.hash
}

export async function login(formData: FormData) {
  const from = safePath(formData.get("from"))
  const password = process.env.SITE_PASSWORD

  if (!password || formData.get("password") !== password) {
    redirect(`/login?error=1&from=${encodeURIComponent(from)}`)
  }

  ;(await cookies()).set(AUTH_COOKIE, (await expectedToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  })
  redirect(from)
}
