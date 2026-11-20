import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PROFILE } from "@/lib/andy-schefter";
import { isEditor } from "@/lib/editor";
import { getTweets } from "@/lib/tweets";
import { UndoDeleteProvider } from "../_components/undo-delete";
import { editorLogout } from "../editor/actions";
import { restoreTweet } from "./actions";
import { Composer } from "./composer";
import { ProfileHeader } from "./profile-header";
import { TweetCard } from "./tweet-card";
import { TweetEditor } from "./tweet-editor";

export const metadata: Metadata = { title: "Andy Schefter" };

export default async function AndySchefterPage() {
    // Always rendered per request: the feed changes whenever someone posts, and so does who can edit
    await connection();
    const [tweets, editor] = await Promise.all([getTweets(), isEditor()]);

    return (
        // A Twitter-style center column. Negative margins cancel <main>'s padding so it runs
        // flush under the site header, and edge to edge on phones.
        <div className="-mx-4 -my-6 sm:mx-auto sm:border-x sm:max-w-[600px]">
            <ProfileHeader profile={PROFILE} />
            {editor && <Composer avatar={PROFILE.avatar} />}
            {editor ? (
                <UndoDeleteProvider restore={restoreTweet} label="Tweet deleted">
                    {tweets.map((tweet) => (
                        <TweetEditor key={tweet.id} tweet={tweet} avatar={PROFILE.avatar}>
                            <TweetCard tweet={tweet} profile={PROFILE} canEdit />
                        </TweetEditor>
                    ))}
                </UndoDeleteProvider>
            ) : (
                tweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} profile={PROFILE} />)
            )}

            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {editor ? (
                    <form action={editorLogout}>
                        <button type="submit" className="hover:text-foreground hover:underline">Log out of editing</button>
                    </form>
                ) : (
                    <Link href="/editor?from=/andy-schefter" className="hover:text-foreground hover:underline">Post as Andy</Link>
                )}
            </div>
        </div>
    );
}
