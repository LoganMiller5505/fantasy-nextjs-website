"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

// Ordered by what a weekly visitor checks first: this season as it stands and what's coming,
// then the talking points (luck, rivalries), then deeper analysis, one manager's whole story,
// then the history books
export const sections = [
  { href: "/statistics", label: "Season" },
  { href: "/statistics/outlook", label: "Outlook" },
  { href: "/statistics/rankings", label: "Power rankings" },
  { href: "/statistics/luck", label: "Luck" },
  { href: "/statistics/head-to-head", label: "Head-to-head" },
  { href: "/statistics/scoring", label: "Scoring" },
  { href: "/statistics/managers", label: "Managers" },
  { href: "/statistics/playoffs", label: "Playoffs" },
  { href: "/statistics/records", label: "Records" },
] as const

// Plain links styled as line tabs: each one is a page, so Tab reaches every section and the
// current one is marked with aria-current. On phones the row scrolls sideways, fades at the
// right edge to show there's more, and starts scrolled to the current section.
export function SectionNav() {
  const pathname = usePathname()
  const active = React.useRef<HTMLAnchorElement>(null)

  React.useEffect(() => {
    active.current?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [pathname])

  return (
    <nav
      aria-label="Statistics sections"
      className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] max-sm:mask-[linear-gradient(to_right,black_85%,transparent)]"
    >
      <ul className="flex w-max gap-1">
        {sections.map(({ href, label }) => {
          // A manager's own page sits under Managers
          const current = pathname === href || (href === "/statistics/managers" && pathname.startsWith(`${href}/`))
          return (
            <li key={href}>
              <Link
                ref={current ? active : undefined}
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-8 items-center rounded-md px-2 text-sm font-medium whitespace-nowrap transition-colors",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                  "after:bg-foreground after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:opacity-0 after:transition-opacity",
                  current ? "text-foreground after:opacity-100" : "text-foreground/60 hover:text-foreground dark:text-muted-foreground"
                )}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
