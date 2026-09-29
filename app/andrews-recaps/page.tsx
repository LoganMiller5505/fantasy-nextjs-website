import { readFile } from "node:fs/promises";
import path from "node:path";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

const RECAP = "1-2";
const RECAP_DIR = path.join(process.cwd(), "public", "andrew-recaps", RECAP);

// Markdown image paths are relative to the .md file (e.g. images/p01-01.png),
// so point them at where public/ serves them from.
function resolveUrl(url: string) {
    if (/^(https?:|\/|#|mailto:)/.test(url)) return defaultUrlTransform(url);
    return defaultUrlTransform(`/andrew-recaps/${RECAP}/${url}`);
}

export default async function AndrewsRecapsPage() {
    const source = await readFile(path.join(RECAP_DIR, `${RECAP}.md`), "utf8");

    return (
        <article className="typeset typeset-docs mx-auto max-w-3xl">
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
