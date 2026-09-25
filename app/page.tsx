import { sql } from '@/lib/db'
import { Video } from './_components/vimeo_video'
import { Bio } from './_components/bio'
import Link from "next/link";

export default async function Page() {
  //const players = await sql`SELECT id, column_1 FROM test LIMIT 10`
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
        <h2>About the GMs</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Bio name="Whieldon" alias="Naberhood Creep" logoPath="/logos/Whieldon.svg" description="15-1 lmaooo" yearsPlayed="3" />
          <Bio name="Robert" alias="Come Cee Whats in my Basement" logoPath="/logos/Robert.jpg" description="Black magic bs" yearsPlayed="3" />
          <Bio name="Andy" alias="Fortuitous Bust" logoPath="/logos/Andy.jpg" title="League Manager" description="Losers bracket MVP" yearsPlayed="3" />
          <Bio name="Logan" alias="Sleepy Joe Flacco" logoPath="/logos/Logan.jpg" title="League Manager" description="The sexiest man alive" yearsPlayed="3" />
          <Bio name="Max" alias="Omani Rials" logoPath="/logos/Max.svg" description="Inshallah the Omani Caliphate shall prevail" yearsPlayed="3" />
          <Bio name="Ethan" alias="Gay butt stuff" logoPath="/logos/Ethan.svg" description="The gayest of the gays" yearsPlayed="3" />
          <Bio name="James" alias="Dont kirk off your cousins" logoPath="/logos/James.svg" title="2025 League Champion" description="The most Kirk of the Kirks" yearsPlayed="3" />
          <Bio name="Matt" alias="Talking tua 12 year old" logoPath="/logos/Matt.svg" title="2024 League Champion" description="Fighting dicks on an island" yearsPlayed="3" />
          <Bio name="Dillon" alias="Big Intelligent Group Dominance" logoPath="/logos/Dillon.svg" description="Bama shirt winner" yearsPlayed="3" />
          <Bio name="Landon" alias="Nacua Matata" logoPath="/logos/Landon.png" description="On the come-up?" yearsPlayed="2" />
          <Bio name="Brady" alias="CRashee and Dart" logoPath="/logos/Brady.svg" description="How is he 2-0 fr" yearsPlayed="R" />
          <Bio name="Andrew" alias="Inside Zone x3 Aww Punts" logoPath="/logos/Andrew.svg" description="Anti-schedule man" yearsPlayed="R" />
        </div>
      </section>

      {/* <h2 className="text-2xl font-bold">Players</h2> */}
      {/* <ul>{players.map((p) => <li key={p.id}>{p.column_1}</li>)}</ul> */}
    </div>
  )
}
