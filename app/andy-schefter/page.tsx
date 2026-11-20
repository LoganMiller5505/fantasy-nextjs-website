import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PROFILE } from "@/lib/andy-schefter";
import { isPoster } from "@/lib/poster";
import { getTweets } from "@/lib/tweets";
import { posterLogout } from "./actions";
import { Composer } from "./composer";
import { ProfileHeader } from "./profile-header";
import { TweetCard } from "./tweet-card";
import { UndoDeleteProvider } from "./undo-delete";

export const metadata: Metadata = { title: "Andy Schefter" };

export default async function AndySchefterPage() {
    // Always rendered per request: the feed changes whenever someone posts, and so does who's a poster
    await connection();
    const [tweets, poster] = await Promise.all([getTweets(), isPoster()]);

    return (
        // A Twitter-style center column. Negative margins cancel <main>'s padding so it runs
        // flush under the site header, and edge to edge on phones.
        <div className="-mx-4 -my-6 sm:mx-auto sm:border-x sm:max-w-[600px]">
            <ProfileHeader profile={PROFILE} />
            {poster && <Composer avatar={PROFILE.avatar} />}
            {poster ? (
                <UndoDeleteProvider>
                    {tweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} profile={PROFILE} canDelete />)}
                </UndoDeleteProvider>
            ) : (
                tweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} profile={PROFILE} />)
            )}

            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {poster ? (
                    <form action={posterLogout}>
                        <button type="submit" className="hover:text-foreground hover:underline">Stop posting as Andy</button>
                    </form>
                ) : (
                    <Link href="/andy-schefter/login" className="hover:text-foreground hover:underline">Post as Andy</Link>
                )}
            </div>
        </div>
    );
}
