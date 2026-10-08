export const AUTH_COOKIE = "site-auth"

// Hex SHA-256 of a string, via Web Crypto so it works in both proxy and server actions
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

// Cookie value for an unlocked visitor. Null when no password is configured, so callers fail closed.
export async function expectedToken() {
  const password = process.env.SITE_PASSWORD
  return password ? sha256(password) : null
}
