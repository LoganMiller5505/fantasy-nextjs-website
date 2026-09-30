import { readFile } from "node:fs/promises";
import path from "node:path";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders public/andrew-recaps/<slug>/<slug>.md
export default async function Recap({ slug }: { slug: string }) {
    const source = await readFile(
        path.join(process.cwd(), "public", "andrew-recaps", slug, `${slug}.md`),
        "utf8",
    );

    // Markdown image paths are relative to the .md file (e.g. images/p01-01.png),
    // so point them at where public/ serves them from.
    function resolveUrl(url: string) {
        if (/^(https?:|\/|#|mailto:)/.test(url)) return defaultUrlTransform(url);
        return defaultUrlTransform(`/andrew-recaps/${slug}/${url}`);
    }

    return (
        <article id={`week-${slug}`} className="typeset typeset-docs mx-auto max-w-3xl scroll-mt-28 lg:scroll-mt-20">
            <Markdown
                remarkPlugins={[remarkGfm]}
                urlTransform={resolveUrl}
                // `node` is react-markdown's AST node; drop it so it isn't rendered as an attribute.
                /* eslint-disable @typescript-eslint/no-unused-vars */
                components={{
                    table: ({ node, ...props }) => (
                        <div className="typeset-scroll">
                            <table {...props} />
                        </div>
                    ),
                    // Image titles are size hints ("small" / "medium") from the pdf-to-markdown skill.
                    img: ({ node, title, alt, ...props }) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={alt ?? ""} {...props} data-size={title} loading="lazy" />
                    ),
                }}
                /* eslint-enable @typescript-eslint/no-unused-vars */
            >
                {source}
            </Markdown>
        </article>
    );
}
