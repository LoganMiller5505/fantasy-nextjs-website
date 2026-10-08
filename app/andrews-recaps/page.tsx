import { Fragment } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"
import Recap from "./recap";

// Folders in public/andrew-recaps, oldest first.
const RECAPS = [
    { slug: "1-2", title: "Weeks 1 & 2" },
    { slug: "3", title: "Week 3" },
    { slug: "4", title: "Week 4" },
];

export default function AndrewsRecapsPage() {
    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Phones: a strip pinned under the site header (-mt-6 cancels <main>'s top padding
                so it starts where it sticks). Desktop: a sidebar. */}
            <nav
                aria-label="Weeks"
                className="sticky top-14 z-40 -mx-4 -mt-6 border-b bg-background/80 px-4 py-2 backdrop-blur lg:top-20 lg:mx-0 lg:mt-0 lg:w-40 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
            >
                <ul className="flex gap-1 overflow-x-auto lg:flex-col">
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
