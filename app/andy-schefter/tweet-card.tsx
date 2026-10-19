import Image from "next/image";
import { Bookmark, ChartNoAxesColumn, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { cn } from "cn";
import type { PROFILE, Tweet } from "@/lib/andy-schefter";
import { VerifiedBadge } from "./profile-header";
import { TweetMedia } from "./tweet-media";

const compact = new Intl.NumberFormat("en-US", { notation: "compact" });

// Dates are written without a timezone, so format in UTC to show them exactly as written
const sameYearFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const otherYearFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

function formatDate(date: string) {
    const d = new Date(`${date}Z`);
    return (d.getUTCFullYear() === new Date().getUTCFullYear() ? sameYearFormat : otherYearFormat).format(d);
}

// Tint @mentions, #hashtags and links like Twitter does (the split's capture group lands on odd indexes)
function renderText(text: string) {
    return text.split(/(@\w+|#\w+|https?:\/\/\S+)/).map((part, i) =>
        i % 2 ? <span key={i} className="text-sky-500">{part}</span> : part
    );
}

export function TweetCard({ tweet, profile }: { tweet: Tweet; profile: typeof PROFILE }) {
    return (
        <article className="flex gap-3 border-b px-4 py-3">
            <Image src={profile.avatar} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover" />

            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-center gap-1 text-[15px]">
                    <span className="truncate font-bold">{profile.name}</span>
                    <VerifiedBadge className="size-4" />
                    <span className="truncate text-muted-foreground">@{profile.handle}</span>
                    <span className="text-muted-foreground">·</span>
                    <time dateTime={tweet.date} className="shrink-0 text-muted-foreground">{formatDate(tweet.date)}</time>
                </p>

                <p className="whitespace-pre-wrap break-words text-[15px]">{renderText(tweet.text)}</p>

                {tweet.images && tweet.images.length > 0 && <TweetMedia images={tweet.images} />}

                {/* For show only, so these are plain text rather than buttons */}
                <div className="mt-1 flex max-w-md justify-between text-sm text-muted-foreground">
                    <Stat icon={MessageCircle} count={tweet.replies} label="replies" hover="hover:text-sky-500" />
                    <Stat icon={Repeat2} count={tweet.retweets} label="reposts" hover="hover:text-emerald-500" />
                    <Stat icon={Heart} count={tweet.likes} label="likes" hover="hover:text-pink-500" />
                    <Stat icon={ChartNoAxesColumn} count={tweet.views} label="views" hover="hover:text-sky-500" />
                    <span className="flex gap-3">
                        <Bookmark className="size-[18px] hover:text-sky-500" aria-hidden />
                        <Share className="size-[18px] hover:text-sky-500" aria-hidden />
                    </span>
                </div>
            </div>
        </article>
    );
}

function Stat({ icon: Icon, count, label, hover }: { icon: typeof Heart; count: number; label: string; hover: string }) {
    return (
        <span className={cn("flex items-center gap-1 transition-colors", hover)}>
            <Icon className="size-[18px]" aria-hidden />
            <span aria-label={`${count.toLocaleString("en-US")} ${label}`}>{compact.format(count)}</span>
        </span>
    );
}
