import { Fragment } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"
import Recap from "./recap";

// Folders in public/andrew-recaps, newest first.
const RECAPS = [
    { slug: "3", title: "Week 3" },
    { slug: "1-2", title: "Weeks 1 & 2" },
];

export default function AndrewsRecapsPage() {
    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <nav aria-label="Weeks" className="lg:sticky lg:top-20 lg:w-40 lg:shrink-0">
                <ul className="flex flex-wrap gap-1 lg:flex-col">
                    {RECAPS.map(({ slug, title }) => (
                        <li key={slug}>
                            <a
                                href={`#week-${slug}`}
                                className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
                            >
                                {title}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="flex min-w-0 flex-1 flex-col gap-4">
                {RECAPS.map(({ slug }, i) => (
                    <Fragment key={slug}>
                        {i > 0 && <Separator className="mx-auto max-w-3xl" />}
                        <Recap slug={slug} />
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
