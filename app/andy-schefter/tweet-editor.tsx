'use client'

import { createContext, startTransition, useActionState, useContext, useState } from "react"
import Image from "next/image"
import { Pencil } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { Tweet } from "@/lib/andy-schefter"
import { updateTweet, type PostState } from "./actions"
import { TweetFields } from "./tweet-fields"
import { TweetMedia } from "./tweet-media"

const MAX_TEXT = 1000

const EditContext = createContext<(() => void) | null>(null)

// Wraps a tweet for posters: shows the tweet, or an inline form for its text, date and counts once
// its pencil (EditTweetButton) is clicked.
export function TweetEditor({ tweet, avatar, children }: { tweet: Tweet; avatar: string; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false)

  if (!editing) return <EditContext value={() => setEditing(true)}>{children}</EditContext>
  return <EditForm tweet={tweet} avatar={avatar} onDone={() => setEditing(false)} />
}

export function EditTweetButton() {
  const startEdit = useContext(EditContext)
  if (!startEdit) return null
  return (
    <button
      type="button"
      aria-label="Edit tweet"
      onClick={startEdit}
      className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-sky-500/10 hover:text-sky-500"
    >
      <Pencil className="size-4" aria-hidden />
    </button>
  )
}

// Mounted fresh each time editing starts, so it always opens with the tweet's current values
function EditForm({ tweet, avatar, onDone }: { tweet: Tweet; avatar: string; onDone: () => void }) {
  const [text, setText] = useState(tweet.text)
  const [state, save, pending] = useActionState(async (prev: PostState, formData: FormData) => {
    const result = await updateTweet(prev, formData)
    if (result.ok) onDone()
    return result
  }, {})

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => save(formData))
  }

  const tooLong = text.length > MAX_TEXT
  const hasImages = (tweet.images?.length ?? 0) > 0
  const canSave = !pending && !tooLong && (text.trim().length > 0 || hasImages)

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => { if (e.key === "Escape" && !pending) onDone() }}
      className="flex gap-3 border-b bg-sky-500/5 px-4 py-3"
    >
      <input type="hidden" name="id" value={tweet.id} />
      <Image src={avatar} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover" />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Tweet text"
          autoFocus
          className="min-h-16 text-[15px]!"
        />

        {hasImages && (
          <div>
            <TweetMedia images={tweet.images!} />
            <p className="mt-1 text-xs text-muted-foreground">Images can&apos;t be edited. Delete and re-post to change them.</p>
          </div>
        )}

        <div>
          <TweetFields tweet={tweet} />
          <p className="mt-1.5 text-xs text-muted-foreground">Clear a count to make one up that fits the others.</p>
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex items-center gap-2">
          <span className={cn("mr-auto text-sm tabular-nums text-muted-foreground", tooLong && "text-destructive")}>
            {text.length}/{MAX_TEXT}
          </span>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending} className="rounded-full">
            Cancel
          </Button>
          <Button type="submit" disabled={!canSave} className="rounded-full bg-sky-500 px-4 font-bold text-white hover:bg-sky-600">
            {pending && <Spinner />}
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}
