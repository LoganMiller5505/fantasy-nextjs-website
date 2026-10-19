import type { Metadata } from "next";
import { PROFILE, TWEETS } from "@/lib/andy-schefter";
import { ProfileHeader } from "./profile-header";
import { TweetCard } from "./tweet-card";

export const metadata: Metadata = { title: "Andy Schefter" };

export default function AndySchefterPage() {
    const tweets = TWEETS.toSorted((a, b) => b.date.localeCompare(a.date));

    return (
        // A Twitter-style center column. Negative margins cancel <main>'s padding so it runs
        // flush under the site header, and edge to edge on phones.
        <div className="-mx-4 -my-6 sm:mx-auto sm:border-x sm:max-w-[600px]">
            <ProfileHeader profile={PROFILE} />
            {tweets.map((tweet) => (
                <TweetCard key={tweet.id} tweet={tweet} profile={PROFILE} />
            ))}
        </div>
    );
}
