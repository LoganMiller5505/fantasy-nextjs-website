import Image from "next/image";
import { BadgeCheck, LinkIcon, MapPin } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { PROFILE } from "@/lib/andy-schefter";

const compact = new Intl.NumberFormat("en-US", { notation: "compact" });

const TABS = ["Posts", "Replies", "Media", "Likes"];

// Everything here is for show: the button and tabs don't do anything.
export function ProfileHeader({ profile }: { profile: typeof PROFILE }) {
    return (
        <header className="border-b">
            <div className="relative aspect-3/1 bg-muted">
                {profile.banner && <Image src={profile.banner} alt="" fill priority sizes="600px" className="object-cover" />}
            </div>

            <div className="px-4">
                <div className="flex items-start justify-between">
                    <div className="relative -mt-[12%] size-20 overflow-hidden rounded-full bg-muted ring-4 ring-background sm:size-32">
                        <Image src={profile.avatar} alt={profile.name} fill priority sizes="128px" className="object-cover" />
                    </div>
                    <span className={buttonVariants({ variant: "outline", className: "mt-3 rounded-full border-border px-4 font-bold" })}>
                        Following
                    </span>
                </div>

                <div className="mt-3">
                    <h1 className="flex items-center gap-1 text-xl font-extrabold">
                        {profile.name}
                        <VerifiedBadge className="size-5" />
                    </h1>
                    <p className="text-[15px] text-muted-foreground">@{profile.handle}</p>
                </div>

                <p className="mt-3 text-[15px]">{profile.bio}</p>

                <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground *:text-[15px]">
                    <li className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{profile.location}</li>
                    {profile.website && (
                        <li className="flex items-center gap-1">
                            <LinkIcon className="size-4" aria-hidden />
                            <span className="text-sky-500">{profile.website}</span>
                        </li>
                    )}
                </ul>

                <p className="mt-3 flex gap-5 text-sm">
                    <span><span className="font-bold">{compact.format(profile.following)}</span> <span className="text-muted-foreground">Following</span></span>
                    <span><span className="font-bold">{compact.format(profile.followers)}</span> <span className="text-muted-foreground">Followers</span></span>
                </p>
            </div>

            <div className="mt-4 grid grid-cols-4 text-center text-sm">
                {TABS.map((tab, i) => (
                    <span key={tab} className={cn("py-4", i === 0 ? "font-bold" : "text-muted-foreground")}>
                        <span className={cn("relative pb-4", i === 0 && "after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:rounded-full after:bg-sky-500")}>
                            {tab}
                        </span>
                    </span>
                ))}
            </div>
        </header>
    );
}

export function VerifiedBadge({ className }: { className?: string }) {
    return <BadgeCheck aria-label="Verified" className={cn("shrink-0 fill-sky-500 text-background", className)} />;
}
