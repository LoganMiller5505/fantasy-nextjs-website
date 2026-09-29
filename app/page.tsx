import { sql } from '@/lib/db'
import { Video } from './_components/vimeo_video'
// import { Bio } from './_components/bio'
import { PowerRank } from './_components/power_rank'
import Link from "next/link";

const powerRankings = [
  { name: "Whieldon", alias: "Naberhood Creep", newRank: 8, logoPath: "/logos/Whieldon.svg", description: "15-1 lmaooo" },
  { name: "Robert", alias: "Come Cee Whats in my Basement", newRank: 9, logoPath: "/logos/Robert.jpg", description: "Black magic bs" },
  { name: "Andy", alias: "Fortuitous Bust", newRank: 5, logoPath: "/logos/Andy.jpg", description: "Losers bracket MVP" },
  { name: "Logan", alias: "Sleepy Joe Flacco", newRank: 1, logoPath: "/logos/Logan.jpg", description: "The sexiest man alive" },
  { name: "Max", alias: "Omani Rials", newRank: 2, logoPath: "/logos/Max.svg", description: "Inshallah the Omani Caliphate shall prevail" },
  { name: "Ethan", alias: "Gay butt stuff", newRank: 12, logoPath: "/logos/Ethan.svg", description: "The gayest of the gays" },
  { name: "James", alias: "Dont kirk off your cousins", newRank: 11, logoPath: "/logos/James.svg", description: "The most Kirk of the Kirks" },
  { name: "Matt", alias: "Talking tua 12 year old", newRank: 4, logoPath: "/logos/Matt.svg", description: "Fighting dicks on an island" },
  { name: "Dillon", alias: "Big Intelligent Group Dominance", newRank: 10, logoPath: "/logos/Dillon.svg", description: "Bama shirt winner" },
  { name: "Landon", alias: "Nacua Matata", newRank: 7, logoPath: "/logos/Landon.png", description: "On the come-up?" },
  { name: "Brady", alias: "CRashee and Dart", newRank: 3, logoPath: "/logos/Brady.svg", description: "How is he 2-0 fr" },
  { name: "Andrew", alias: "Inside Zone x3 Aww Punts", newRank: 6, logoPath: "/logos/Andrew.svg", description: "Anti-schedule man" },
]

export default async function Page() {
  return (
    <div className="space-y-8 flow-root">
      <section className="space-y-4">
        <Video id="1229757405" title="Haters Guide" className="lg:float-left lg:w-1/2 lg:mr-6" />
        <h1>Welcome to the Run It Up The Middle Enjoyers "League Huddle" Website!</h1>
        <p>This website serves as a collection of videos and information for the Run It Up The Middle Enjoyers Fantasy Football league.</p>
        <p>Here, you can find:</p>
        <ul className="list-disc list-inside">
          <li><Link href="/weekly-replays" className="link">Graphed playback</Link> for each matchup</li>
          <li>Andrew's hand-written <Link href="/andrews-recaps" className="link">weekly summaries</Link></li>
          <li>Various <Link href="/statistics" className="link">statistics and data</Link></li>
          <li>A compilation of <Link href="/slander-gallery" className="link">all league slander</Link></li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2>Power Rankings (Week 3)</h2>
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-2">
          {[...powerRankings]
            .sort((a, b) => a.newRank - b.newRank)
            .map((team) => <PowerRank key={team.name} {...team} />)}
        </div>
      </section>

      {/* <h2 className="text-2xl font-bold">Players</h2> */}
      {/* <ul>{players.map((p) => <li key={p.id}>{p.column_1}</li>)}</ul> */}
    </div>
  )
}
