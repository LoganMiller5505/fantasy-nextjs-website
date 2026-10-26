"use client"

import Link from "next/link"
import type { WeekSummary } from "../_lib/managers"
import { ManagerLink, Section, StatTile, TileGrid, fmt } from "../_components/ui"

// Odds as whole percents, with "<1%" for anything that's possible but rounds to nothing
const odds = (p: number) => (p >= 0.5 ? `${Math.round(p)}%` : p > 0 ? "<1%" : "0%")

// The highlighted manager's season at a glance, at the top of Season: the answers to "how am I
// doing?" that are otherwise spread over Season, Outlook, Luck and Scoring
export function YourWeek({ manager, summary }: { manager: string; summary: WeekSummary }) {
  const luck = summary.luck
  return (
    <Section
      title={`${manager}'s ${summary.year}`}
      description={
        <>
          Where things stand before {summary.week}. More on <ManagerLink manager={manager}>{manager}&apos;s page</ManagerLink>.
        </>
      }
    >
      <TileGrid wide={3}>
        <StatTile label="Place" value={summary.place} detail={`${summary.record}, of ${summary.of}`} />
        <StatTile
          label={`Next: ${summary.week}`}
          value={summary.next ? `vs ${summary.next.opponent}` : "No game"}
          detail={summary.next ? `${summary.next.h2h} all-time` : "A bye week"}
        />
        <StatTile
          label="Playoff odds"
          value={
            summary.odds?.status === "clinched" ? "Clinched" : summary.odds?.status === "eliminated" ? "Out" : summary.odds ? odds(summary.odds.playoffs) : "—"
          }
          detail={
            summary.odds ? (
              <>
                ~{summary.odds.projectedWins.toFixed(1)} wins projected ·{" "}
                <Link href="/statistics/outlook" className="underline-offset-2 hover:underline">
                  Outlook
                </Link>
              </>
            ) : (
              "Regular season over"
            )
          }
        />
        <StatTile
          label="Streak"
          value={summary.streak ? `${summary.streak.kind}${summary.streak.length}` : "—"}
          detail={summary.streak ? `Since ${summary.streak.from}` : ""}
        />
        <StatTile
          label="Luck"
          value={luck == null ? "—" : `${luck > 0 ? "+" : ""}${fmt(luck, 1)} wins`}
          detail="Wins above or below what the scores deserved"
        />
        <StatTile label="Scoring" value={summary.ppgRank ?? "—"} detail={summary.ppg == null ? "" : `${fmt(summary.ppg, 1)} points per game`} />
      </TileGrid>
    </Section>
  )
}
