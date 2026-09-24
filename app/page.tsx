import { sql } from '@/lib/db'
import { Video } from './components/video'
import { Bio } from './components/bio'

export default async function Page() {
  //const players = await sql`SELECT id, column_1 FROM test LIMIT 10`
  return (
    <div className="space-y-8">
      <Video id="1229757405" title="Haters Guide" className="lg:float-left lg:w-1/2 lg:mr-6" />
      <h1 className="text-3xl font-bold">Welcome to the Run It Up The Middle Enjoyers "League Huddle" Website!</h1>
      <p className="text-lg">This website serves as a collection of videos and information for the Run It Up The Middle Enjoyers Fantasy Football league.</p>
      <p className="text-lg">Here, you can find:</p>
      <ul className="list-disc list-inside text-lg">
        <li><a href="/WeeklyReplays" className="text-blue-500 hover:underline">Graphed playback</a> for each matchup</li>
        <li>Andrew's hand-written <a href="/AndrewsRecaps" className="text-blue-500 hover:underline">weekly summaries</a></li>
        <li>Various <a href="/Statistics" className="text-blue-500 hover:underline">statistics and data</a></li>
        <li>A compilation of <a href="/SlanderGallery" className="text-blue-500 hover:underline">all league slander</a></li>
      </ul>
      <h2 className="text-2xl font-bold">Meet the GMs</h2>

      <Bio name="Whieldon" alias="Naberhood Creep" logoPath="logos/Whieldon.svg" description="15-1 lmaooo" yearsPlayed="3"></Bio>
      <Bio name="Robert" alias="Come Cee Whats in my Basement" logoPath="logos/Robert.jpg" description="Black magic bs" yearsPlayed="3"></Bio>
      <Bio name="Andy" alias="Fortuitous Bust" logoPath="logos/Andy.jpg" title="League Manager" description="Losers bracket MVP" yearsPlayed="3"></Bio>
      <Bio name="Logan" alias="Sleepy Joe Flacco" logoPath="logos/Logan.jpg" title="League Manager" description="The sexiest man alive" yearsPlayed="3"></Bio>
      <Bio name="Max" alias="Omani Rials" logoPath="logos/Max.svg" description="Inshallah the Omani Caliphate shall prevail" yearsPlayed="3"></Bio>
      <Bio name="Ethan" alias="Gay butt stuff" logoPath="logos/Ethan.svg" description="The gayest of the gays" yearsPlayed="3"></Bio>
      <Bio name="James" alias="Dont kirk off your cousins" logoPath="logos/James.svg" title="2025 League Champion" description="The most Kirk of the Kirks" yearsPlayed="3"></Bio>
      <Bio name="Matt" alias="Talking tua 12 year old" logoPath="logos/Matt.svg" title="2024 League Champion" description="Fighting dicks on an island" yearsPlayed="3"></Bio>
      <Bio name="Dillon" alias="Big Intelligent Group Dominance" logoPath="logos/Dillon.svg" description="Bama shirt winner" yearsPlayed="3"></Bio>
      <Bio name="Landon" alias="Nacua Matata" logoPath="logos/Landon.png" description="On the come-up?" yearsPlayed="2"></Bio>
      <Bio name="Brady" alias="CRashee and Dart" logoPath="logos/Brady.svg" description="How is he 2-0 fr" yearsPlayed="R"></Bio>
      <Bio name="Andrew" alias="Inside Zone x3 Aww Punts" logoPath="logos/Andrew.svg" description="Anti-schedule man" yearsPlayed="R"></Bio>

      {/* <h2 className="text-2xl font-bold">Players</h2> */}
      {/* <ul>{players.map((p) => <li key={p.id}>{p.column_1}</li>)}</ul> */}
    </div>
  )
}
