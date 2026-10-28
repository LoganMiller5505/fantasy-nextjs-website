import type { Metadata } from "next"
import { SectionNav } from "./_components/section-nav"

export const metadata: Metadata = { title: "Statistics" }

// Rebuild every stats page from the database at most every 5 minutes, so a sheet upload shows up without a redeploy
export const revalidate = 300

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return (
    // minmax(0, 1fr) keeps wide tables and the scrolling section bar from widening the page on phones
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {/* Not shown (the site nav already says where you are), but kept for screen readers */}
        <h1 className="sr-only">Statistics</h1>
        <SectionNav />
      </div>
      {children}
    </div>
  )
}
