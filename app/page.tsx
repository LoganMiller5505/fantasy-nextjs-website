import { sql } from '@/lib/db'
import { Video } from './_components/vimeo_video'
// import { Bio } from './_components/bio'
import { PowerRank } from './_components/power_rank'
import Link from "next/link";
import { ChartColumn, ChartLine, Flame, NotebookPen } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const powerRankings = [
  { name: "Whieldon", alias: "Naberhood Creep",               newRank: 8,   oldRank: 7, logoPath: "/logos/Whieldon.svg", description: "How the mighty have fallen" },
  { name: "Robert", alias: "Come Cee Whats in my Basement",   newRank: 9,   oldRank: 10, logoPath: "/logos/Robert.jpg", description: "Has he lost the magic?" },
  { name: "Andy", alias: "Fortuitous Bust",                   newRank: 5,   oldRank: 6, logoPath: "/logos/Andy.jpg", description: "115 points or nothing" },
  { name: "Logan", alias: "Sleepy Joe Flacco",                newRank: 1,   oldRank: 1, logoPath: "/logos/Logan.jpg", description: "The clear favorite" },
  { name: "Max", alias: "Omani Rials",                        newRank: 2,   oldRank: 3, logoPath: "/logos/Max.svg", description: "Strongest player in the strongest division" },
  { name: "Ethan", alias: "Gay butt stuff",                   newRank: 12,  oldRank: 11, logoPath: "/logos/Ethan.svg", description: "Weakest player in the weakest division" },
  { name: "James", alias: "Dont kirk off your cousins",       newRank: 11,  oldRank: 12, logoPath: "/logos/James.jpg", description: "Only here because Ethan's worse" },
  { name: "Matt", alias: "Robert molester",                   newRank: 4,   oldRank: 5, logoPath: "/logos/Matt.svg", description: "Bouncing back strong from last season" },
  { name: "Dillon", alias: "Big Intelligent Group Dominance", newRank: 10,  oldRank: 9, logoPath: "/logos/Dillon.svg", description: "Going back to whence he came" },
  { name: "Landon", alias: "Nacua Matata",                    newRank: 7,   oldRank: 8, logoPath: "/logos/Landon.png", description: "Volatility personified" },
  { name: "Brady", alias: "CRashee and Dart",                 newRank: 3,   oldRank: 4, logoPath: "/logos/Brady.svg", description: "Reeking of fraudulence, but still undefeated" },
  { name: "Andrew", alias: "Inside Zone x3 Aww Punts",        newRank: 6,   oldRank: 2, logoPath: "/logos/Andrew.jpg", description: "Bugatti in trailer park" },
]

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

      <section className="space-y-4">
        <h2>Power Rankings (Week 3)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...powerRankings]
            .sort((a, b) => a.newRank - b.newRank)
            .map((team) => <PowerRank key={team.name} {...team} />)}
        </div>
      </section>

    </div>
  )
}
