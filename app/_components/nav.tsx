"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme_toggle";

const links = [
    { href: "/", label: "Home" },
    { href: "/weekly-replays", label: "Weekly Replays" },
    { href: "/andrews-recaps", label: "Andrew's Recaps" },
    { href: "/statistics", label: "Statistics" },
    { href: "/slander-gallery", label: "Slander Gallery" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
      <ul className="flex gap-6 flex-wrap">
        {links.map(({ href, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "font-semibold text-zinc-950 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <ThemeToggle />
      </div>
    </nav>
  );
}