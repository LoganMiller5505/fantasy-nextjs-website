// Small checks and defaults shared by the site's server actions

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// en-CA formats dates as YYYY-MM-DD
const central = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" })

// Today on league time (Auburn), as "YYYY-MM-DD"
export function todayCentral() {
  return central.format(new Date())
}

// "YYYY-MM-DD" that's a real calendar date (no Feb 30)
export function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(`${date}T00:00Z`)
  return !isNaN(d.getTime()) && d.toISOString().startsWith(date)
}

// "RobertLosing.png" → "Robert Losing", "dillon_relegation.jpg" → "dillon relegation"
export function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim()
}

// Only allow same-site paths so a login form can't be used as an open redirect
export function safePath(from: FormDataEntryValue | null | undefined) {
  // Browsers treat "\" like "/", so "/\evil.com" would otherwise escape to another host
  if (typeof from !== "string" || /[\\\x00-\x1f]/.test(from) || !from.startsWith("/") || from.startsWith("//")) {
    return "/"
  }
  const url = new URL(from, "http://localhost")
  if (url.origin !== "http://localhost") return "/"
  // Normalizing can reintroduce "//" (e.g. "/.//evil.com"), so collapse leading slashes
  return url.pathname.replace(/^\/+/, "/") + url.search + url.hash
}
