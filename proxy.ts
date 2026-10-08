import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_COOKIE, expectedToken } from "@/lib/auth"

export async function proxy(request: NextRequest) {
  const token = await expectedToken()
  if (token && request.cookies.get(AUTH_COOKIE)?.value === token) {
    return NextResponse.next()
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("from", request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Everything except the login page and Next's build assets, including files in public/
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
}
