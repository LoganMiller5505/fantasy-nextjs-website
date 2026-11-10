"use client"

import * as React from "react"
import { cn } from "cn"
import { FlaskConical, RotateCcw, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Pick } from "../_lib/picks"
import type { Paths } from "../_lib/paths"

type Game = Paths["games"][number]

// A picked side, tinted like the highlight
const PICKED = "aria-pressed:border-(--highlight) aria-pressed:bg-[color-mix(in_oklab,var(--highlight)_14%,var(--card))]"

export const winnerOf = (g: Game, p: Pick) => (p === "home" ? g.home : p === "away" ? g.away : null)

// One game: tap a side to pick them, tap them again to leave it open
export function PickToggle({
  game,
  pick,
  onPick,
  highlighted,
  className,
}: {
  game: Game
  pick: Pick
  onPick: (pick: Pick) => void
  highlighted?: string | null
  className?: string
}) {
  return (
    <ToggleGroup
      aria-label={`${game.home} vs ${game.away}, ${game.week}: pick a winner`}
      variant="outline"
      spacing={0}
      className={cn(
        "w-full rounded-md",
        highlighted != null && (game.home === highlighted || game.away === highlighted) && "ring-2 ring-(--highlight)",
        className
      )}
      value={pick ? [pick] : []}
      onValueChange={(pressed) => onPick((pressed[0] as Pick | undefined) ?? null)}
    >
      {(["home", "away"] as const).map((side) => (
        <ToggleGroupItem key={side} value={side} className={cn("min-w-0 flex-1 truncate", PICKED)}>
          {side === "home" ? game.home : game.away}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

// The toolbar's what-if control: a button with the number of picks, opening a sheet with every
// remaining game, week by week
export function WhatIfPicker({
  games,
  picks,
  onChange,
  highlighted,
  open,
  onOpenChange,
}: {
  games: Game[]
  picks: Pick[]
  onChange: (picks: Pick[]) => void
  highlighted: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // The schedule comes in no particular week order, so the tabs are put in order: W10 before W13
  const weeks = [...new Set(games.map((g) => g.week))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
  const count = picks.filter(Boolean).length
  const [week, setWeek] = React.useState(weeks[0])
  const set = (i: number, p: Pick) => onChange(picks.map((x, j) => (j === i ? p : x)))
  // Every open game of m's goes their way (or against them)
  const out = (m: string, win: boolean) =>
    onChange(picks.map((p, i) => (games[i].home === m ? (win ? "home" : "away") : games[i].away === m ? (win ? "away" : "home") : p)))
  const inWeek = (w: string) => games.flatMap((g, i) => (g.week === w ? [i] : []))
  const weekCount = (w: string) => inWeek(w).filter((i) => picks[i]).length

  return (
    <>
      <Button variant={count ? "secondary" : "outline"} size="sm" className="shrink-0" onClick={() => onOpenChange(true)}>
        <FlaskConical aria-hidden />
        What if
        {count > 0 && (
          <Badge variant="outline" className="h-4 px-1 text-[0.65rem] tabular-nums">
            {count}
          </Badge>
        )}
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>What if…</SheetTitle>
            <SheetDescription>
              Pick the winners of any games left in the regular season. The whole page, odds, paths and all, is worked out again with
              those results in. Tap a picked side again to leave that game open.
            </SheetDescription>
          </SheetHeader>
          <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-4 pb-4">
            {highlighted && games.some((g) => g.home === highlighted || g.away === highlighted) && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => out(highlighted, true)}>
                  {highlighted} wins out
                </Button>
                <Button variant="outline" size="sm" onClick={() => out(highlighted, false)}>
                  {highlighted} loses out
                </Button>
              </div>
            )}
            <Tabs value={week} onValueChange={(w) => setWeek(w as string)}>
              <TabsList className="w-full">
                {weeks.map((w) => (
                  <TabsTrigger key={w} value={w} className="gap-1 tabular-nums">
                    {w}
                    {weekCount(w) > 0 && <span className="text-(--highlight) text-[0.65rem]">{weekCount(w)}</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
              {weeks.map((w) => (
                <TabsContent key={w} value={w} className="grid gap-2 pt-2">
                  {inWeek(w).map((i) => (
                    <PickToggle key={i} game={games[i]} pick={picks[i]} onPick={(p) => set(i, p)} highlighted={highlighted} />
                  ))}
                  {weekCount(w) > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-self-start"
                      onClick={() => onChange(picks.map((p, i) => (games[i].week === w ? null : p)))}
                    >
                      <X aria-hidden />
                      Clear {w}
                    </Button>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
          <SheetFooter className="flex-row justify-between border-t">
            <Button variant="ghost" size="sm" disabled={!count} onClick={() => onChange(picks.map(() => null))}>
              <RotateCcw aria-hidden />
              Reset all
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

// Under the toolbar while a what-if is on: what's picked, whether the odds are still being worked
// out, and a way to edit or drop it
export function ScenarioBar({
  games,
  picks,
  pending,
  error,
  onEdit,
  onReset,
}: {
  games: Game[]
  picks: Pick[]
  pending: boolean
  error: boolean
  onEdit: () => void
  onReset: () => void
}) {
  // In week order, like the schedule
  const picked = games
    .flatMap((g, i) => (picks[i] ? [{ g, winner: winnerOf(g, picks[i])!, loser: picks[i] === "home" ? g.away : g.home }] : []))
    .sort((a, b) => Number(a.g.week.slice(1)) - Number(b.g.week.slice(1)))
  const shown = picked.slice(0, 2)
  return (
    <div className="flex min-w-0 basis-full items-center gap-2 rounded-md border border-(--highlight)/40 bg-[color-mix(in_oklab,var(--highlight)_8%,var(--background))] px-3 py-1.5 text-sm">
      {pending ? <Spinner className="size-4 shrink-0" /> : <FlaskConical className="size-4 shrink-0 text-(--highlight)" aria-hidden />}
      <div className="min-w-0 flex-1 truncate text-sm" aria-live="polite">
        <span className="font-medium">
          What if: {picked.length} result{picked.length === 1 ? "" : "s"} picked
        </span>
        <span className="text-muted-foreground">
          {" · "}
          {error
            ? "Couldn't work out the odds; try again"
            : pending
              ? "Working out the odds…"
              : shown.map(({ g, winner, loser }) => `${winner} over ${loser} (${g.week})`).join(", ") +
                (picked.length > shown.length ? `, +${picked.length - shown.length} more` : "")}
        </span>
      </div>
      <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={onEdit}>
        Edit
      </Button>
      <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label="Drop the what-if" onClick={onReset}>
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
