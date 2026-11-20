'use client'

import { createContext, useContext, useEffect, useState, useTransition } from "react"
import { Spinner } from "@/components/ui/spinner"

const SHOW_MS = 10_000

const DeletedContext = createContext<(id: string) => void>(() => {})

// Lets a delete button report what it deleted
export const useOnDeleted = () => useContext(DeletedContext)

// Wraps a list for editors. After a delete, shows a Twitter-style "Tweet deleted · Undo" bar at the
// bottom of the screen for a few seconds. Only the latest delete can be undone here; older ones stay
// in the database for 7 days (their deleted_at column) and can be restored by clearing that.
export function UndoDeleteProvider({ restore, label, children }: {
  restore: (id: string) => Promise<void>
  label: string
  children: React.ReactNode
}) {
  const [deleted, setDeleted] = useState<{ id: string; at: number } | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!deleted || pending) return
    const timer = setTimeout(() => setDeleted(null), SHOW_MS)
    return () => clearTimeout(timer)
  }, [deleted, pending])

  function undo() {
    if (!deleted) return
    const { id } = deleted
    startTransition(async () => {
      await restore(id)
      setDeleted(null)
    })
  }

  return (
    <DeletedContext value={(id) => setDeleted({ id, at: Date.now() })}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {deleted && (
          // keyed by time so a second delete restarts the entrance animation
          <div
            key={deleted.at}
            className="pointer-events-auto flex items-center gap-4 rounded-md bg-sky-500 py-2.5 pl-4 pr-2 text-[15px] text-white shadow-lg animate-in fade-in slide-in-from-bottom-2"
          >
            <span>{label}</span>
            <button
              type="button"
              onClick={undo}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition-colors hover:bg-white/15 disabled:opacity-70"
            >
              {pending && <Spinner className="size-4" />}
              Undo
            </button>
          </div>
        )}
      </div>
    </DeletedContext>
  )
}
