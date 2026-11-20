"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { EDITOR_COOKIE, expectedEditorToken } from "@/lib/auth"
import { safePath } from "@/lib/forms"

export async function editorLogin(formData: FormData) {
  const from = safePath(formData.get("from"))
  const password = process.env.EDITOR_PASSWORD
  if (!password || formData.get("password") !== password) {
    redirect(`/editor?error=1&from=${encodeURIComponent(from)}`)
  }

  ;(await cookies()).set(EDITOR_COOKIE, (await expectedEditorToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  })
  redirect(from)
}

export async function editorLogout() {
  ;(await cookies()).delete(EDITOR_COOKIE)
}
