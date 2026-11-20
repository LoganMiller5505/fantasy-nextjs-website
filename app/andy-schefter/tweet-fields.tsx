import { Input } from "@/components/ui/input"
import type { Tweet } from "@/lib/andy-schefter"

const COUNTS = [
  { name: "replies", label: "Replies" },
  { name: "retweets", label: "Reposts" },
  { name: "likes", label: "Likes" },
  { name: "views", label: "Views" },
] as const

// The date and count inputs shared by the composer and the editor. Blank means today / made up.
export function TweetFields({ tweet }: { tweet?: Tweet }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="text-xs text-muted-foreground">Date</span>
        <Input type="date" name="date" defaultValue={tweet?.date} />
      </label>
      {COUNTS.map((c) => (
        <label key={c.name} className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{c.label}</span>
          <Input
            type="number" name={c.name} min={0} max={2 ** 31 - 1} step={1} inputMode="numeric"
            placeholder="Random" defaultValue={tweet?.[c.name]}
          />
        </label>
      ))}
    </div>
  )
}
