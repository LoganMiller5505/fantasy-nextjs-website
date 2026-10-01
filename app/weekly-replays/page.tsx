import { Suspense } from "react"
import { getReplayWeeks } from "@/lib/weekly-replays"
import { ReplaysFromUrl, ReplaysView } from "./replays-view"

export default function WeeklyReplaysPage() {
  const weeks = getReplayWeeks()

  return (
    <div className="flex flex-col gap-4">
      {weeks.length === 0 ? (
        <p className="text-muted-foreground">No replays yet.</p>
      ) : (
        // Prerendered with the latest week; ?week=N is applied on the client
        <Suspense fallback={<ReplaysView weeks={weeks} />}>
          <ReplaysFromUrl weeks={weeks} />
        </Suspense>
      )}
    </div>
  )
}
