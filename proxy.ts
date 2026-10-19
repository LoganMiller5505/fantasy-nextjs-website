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
  // Everything except the login page, Next's build assets, and the public/ images rendered with next/image.
  // The image optimizer fetches local images internally without the visitor's cookies, so gated images fail
  // to optimize. Scoped to those folders so other routes can't skip auth just by ending in an image extension.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|(?:slander-gallery|logos|andy-schefter)/[^/]+\\.(?:png|jpe?g|gif|webp|avif)$).*)"],
}
