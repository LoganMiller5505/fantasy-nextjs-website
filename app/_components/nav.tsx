"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme_toggle";

const SITE_NAME = "The League Huddle";

const links = [
    { href: "/weekly-replays", label: "Weekly Replays" },
    { href: "/andrews-recaps", label: "Andrew's Recaps" },
    { href: "/statistics", label: "Statistics" },
    { href: "/slander-gallery", label: "Slander Gallery" },
];

function linkClass(active: boolean, className?: string) {
  return buttonVariants({
    variant: "ghost",
    className: cn(active ? "bg-muted text-foreground" : "text-muted-foreground", className),
  });
}

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="font-semibold">
          {SITE_NAME}
        </Link>

        <nav className="hidden md:block">
          <ul className="flex gap-1">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={linkClass(isActive(href))}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />

          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden" />}
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>{SITE_NAME}</SheetTitle>
              </SheetHeader>
              <nav className="px-2">
                <ul className="flex flex-col gap-1">
                  {links.map(({ href, label }) => (
                    <li key={href}>
                      {/* SheetClose closes the panel when a link is tapped */}
                      <SheetClose
                        nativeButton={false}
                        render={
                          <Link
                            href={href}
                            aria-current={isActive(href) ? "page" : undefined}
                            className={linkClass(isActive(href), "w-full justify-start")}
                          />
                        }
                      >
                        {label}
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
