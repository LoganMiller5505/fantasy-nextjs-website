import { sql } from '@/lib/db'
import { Video } from './_components/vimeo_video'
// import { Bio } from './_components/bio'
import { Suspense } from 'react'
import { POWER_RANKINGS } from '@/lib/power-rankings'
import { PowerRankingsFromUrl, PowerRankingsView } from './_components/power_rankings'
import Link from "next/link";
import { ChartColumn, ChartLine, Flame, NotebookPen } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  { href: "/weekly-replays", title: "Weekly Replays", description: "Graphed playback for each matchup", icon: ChartLine },
  { href: "/andrews-recaps", title: "Andrew's Recaps", description: "Hand-written weekly summaries", icon: NotebookPen },
  { href: "/statistics", title: "Statistics", description: "All-time matchups and head-to-heads", icon: ChartColumn },
  { href: "/slander-gallery", title: "Slander Gallery", description: "A compilation of all league slander", icon: Flame },
]

export default async function Page() {
  return (
    <div className="space-y-10">
      <section className="grid items-center gap-6 lg:grid-cols-2">
        <Card className="bg-black py-0">
          <Video id="1229757405" title="Haters Guide" />
        </Card>
        <div className="space-y-3">
          <h1>Welcome to the Run It Up The Middle Enjoyers &ldquo;League Huddle&rdquo; Website!</h1>
          <p className="text-muted-foreground">This website serves as a collection of videos and information for the Run It Up The Middle Enjoyers Fantasy Football league.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-colors group-hover:bg-muted/50">
              <CardHeader>
                <Icon className="mb-2 size-5 text-muted-foreground" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      {/* Prerendered with the latest week; ?week=N is applied on the client */}
      <Suspense fallback={<PowerRankingsView weeks={POWER_RANKINGS} />}>
        <PowerRankingsFromUrl weeks={POWER_RANKINGS} />
      </Suspense>

    </div>
  )
}
