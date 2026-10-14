'use client'

import { cn } from "cn"
import { CrownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = { pressed: boolean; onPressedChange: (next: boolean) => void }

export function HallOfFameToggle({ pressed, onPressedChange }: Props) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        pressed
          ? "border-amber-500 bg-linear-to-b from-amber-300 to-amber-500 text-amber-950 shadow-sm shadow-amber-500/40 hover:from-amber-200 hover:to-amber-400 hover:text-amber-950 dark:border-amber-400 dark:hover:text-amber-950"
          : "border-amber-400/70 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20 dark:hover:text-amber-200"
      )}
    >
      <CrownIcon className={cn(pressed && "fill-current")} />
      Hall of Fame
    </Button>
  )
}
