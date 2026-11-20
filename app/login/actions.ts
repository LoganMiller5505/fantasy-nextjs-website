"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_COOKIE, expectedToken } from "@/lib/auth"
import { safePath } from "@/lib/forms"

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
