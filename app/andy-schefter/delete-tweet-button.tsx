'use client'

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { deleteTweet } from "./actions"
import { useOnDeleted } from "./undo-delete"

export function DeleteTweetButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const onDeleted = useOnDeleted()

  return (
    <button
      type="button"
      aria-label="Delete tweet"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await deleteTweet(id)
          onDeleted(id)
        })
      }}
      className="ml-auto shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      {pending ? <Spinner className="size-4" /> : <Trash2 className="size-4" aria-hidden />}
    </button>
  )
}
