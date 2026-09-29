---
name: pdf-to-markdown
description: Convert a messy or poorly structured PDF (exported Google/Word docs, newsletters, recaps, reports, scans) into clean, well-structured Markdown with a real heading hierarchy, joined paragraphs, lists, tables, and extracted, sized images with informative alt text. Use when the user asks to convert, clean up, restructure, or "turn into markdown/.md" a PDF.
argument-hint: <input.pdf> [output-folder]
allowed-tools: Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/*) Bash(uv run ${CLAUDE_SKILL_DIR}/scripts/*) Read Write Edit
---

# PDF → structured Markdown

Turn a PDF whose structure is only implicit (uniform fonts, hard line wraps, screenshots instead of tables, labels split from their content by page breaks) into Markdown with explicit structure and every meaningful image extracted, linked, and described.

Arguments: $ARGUMENTS
First argument = input PDF, optional second = output folder. If no arguments were given, use the PDF the user mentioned. Default output folder: a folder named after the PDF, next to it.

## 1. Extract

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/extract.py "<input.pdf>" --out "<out-dir>"
```

If PyMuPDF (or, later, Pillow) is missing, run the same script with `uv run` instead of `python3` — the scripts declare their own dependencies. Without uv: `pip install pymupdf pillow` (add `--break-system-packages` if pip refuses).

It writes:
- `<out>/images/` — every image, deduplicated. The final Markdown links here.
- `<out>/_work/layout.md` — all text in reading order, one line per PDF line, with `[[IMAGE …]]` / `[[FIGURE …]]` placeholders where visuals sit and `<!-- page N -->` markers.
- `<out>/_work/manifest.json` — image inventory, body font size, PDF outline (if any), removed running headers/footers, pages flagged for a visual check.
- `<out>/_work/pages/` — renders of flagged pages (`--render-all` renders every page).

## 2. Read the evidence

- Read `manifest.json`, then `layout.md` (in ~400-line chunks if long).
- `[[IMAGE …]]` placeholders say how wide the author placed each image (`= 45% of text width`). That is the author's sizing intent; step 6 carries it into the Markdown.
- Layout tags: `{H 18pt}` larger than body text · `{small 8pt}` · `{indent}` · `{center}` · `{in-figure}` text drawn inside a vector figure. A blank line means a vertical gap in the PDF. `**…**` / `*…*` come from the font's weight/style.
- Open every flagged page render with Read. Reasons: `scanned` (no text layer: transcribe from the render), `multi-column` (confirm reading order), `vector-figure` (decide whether it is a figure or a table).

## 3. Look at every image

Open each file in `images/` with Read (placeholders marked `duplicate` reuse an earlier file; look once). Classify:

| Kind | Examples | Do |
|---|---|---|
| Data | score cards, tables, charts, standings, trade/transaction cards, receipts, UI or social-media screenshots whose text matters | Keep the image; put the key facts in its alt text. Don't transcribe it below — the image is visible, so a copy of its contents is redundant |
| Illustrative | photos, memes, cartoons, diagrams | Keep, with descriptive alt text |
| Decorative | logos repeated on every page, dividers, textures, bullet icons | Drop; mention in the report |

Alt text: one sentence saying what the image shows (and its role, if clear), with the facts a reader would need if the image didn't load: short printed text, scores, the winner, who traded whom. For a big table or dense screenshot, summarize (what it lists, the headline) rather than copying every cell. Never "image", "screenshot", or the filename. Copy numbers exactly as shown; never compute or correct them.

Transcribe into the body only content that won't be visible as an image: text on a `scanned` page (the page render is not kept), or data in an image you are dropping. If the user explicitly asks for searchable/transcribed data, add it under the image then.

While you look, note any image whose automatic size (step 6) would be wrong for its role — mainly data images with small print that would become unreadable if shrunk (a tall standings screenshot, a dense stat sheet). You will size those up (`"medium"` or `"full"`) — with no transcription below, the picture is the only way to read them.

## 4. Decide the structure

Follow [reference/structuring-rules.md](reference/structuring-rules.md). Before writing Markdown, write the outline (H1/H2/H3 list) in your reply to yourself and check it for consistency. Key points:
- When font sizes carry no signal, headings come from patterns: short standalone lines, lines ending in `:`, `X vs Y`, `Week N`, bold ALL-CAPS lines, a label immediately followed by an image. The same pattern gets the same level everywhere.
- Join hard-wrapped lines into paragraphs, paragraphs split by page breaks, and `-` hyphenation at line ends.
- A label whose content landed on the next page (e.g. `Worst Game:` at the bottom, its image at the top of the next page) is reattached.

## 5. Write

Write `<out>/<pdf-stem>.md`. Link images relatively without a title: `![alt](images/p03-01.png)`; step 6 adds sizes. For long documents, write the heading skeleton first, then fill it section by section with Edit.

**Fidelity:** keep the author's words, spelling, and numbers. Fix only mechanical artifacts: line wraps, hyphenation, page splits, running headers/footers, page numbers. Do not correct typos, rephrase, or delete leftover draft text unless the user asked for cleanup; list those spots in the report instead.

## 6. Size and optimize images

Raw extractions are the wrong size for reading: phone photos arrive as multi-MB PNGs, banners at 2048px, and every image would render full-width regardless of how the author placed it. Fix that in one pass:

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/images.py "<out>/<pdf-stem>.md" --dry-run
```

Read the table: one row per image with its chosen size and why. The sizes are display widths in a ~768px (48rem) text column:

| Hint | Width | Chosen when | Typical content |
|---|---|---|---|
| *(none)* = full | whole column | author placed it ≥ 80% wide | score cards, tables, wide charts |
| `"medium"` | ~2/3 column (32rem) | 50–80% wide, or too tall for full | photos, square graphics |
| `"small"` | ~5/12 column (20rem) | < 50% wide, low-res, or very tall | memes, avatars, logos, phone screenshots |

It steps an image down when full size would make it taller than ~0.85× the column (a portrait phone photo shouldn't fill the whole screen) or would upscale a low-res file. If a decision is wrong for the image's role, override it by setting the title yourself — `![Trade card: …](images/p07-01.png "medium")` — then re-run without `--dry-run`:

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/images.py "<out>/<pdf-stem>.md"
```

It resizes each file to 2× its display width (sharp on high-DPI screens, never upscaled), re-encodes photos as JPEG and flat screenshots/graphics as PNG (palette PNG when that is smaller), drops unused transparency, updates links when an extension changes, and writes the hint as the image title (`"small"` / `"medium"`; full width stays bare). Your overrides are kept. Originals are cached in `_work/originals/`, so re-running after changing a hint starts from full quality. If the user's site has a text column other than 768px, pass `--column-px`.

Why a title: it keeps the file plain Markdown. Viewers that don't know the convention just show a tooltip; a site renderer maps it to a width (see [reference/structuring-rules.md](reference/structuring-rules.md#image-sizing)).

## 7. Verify

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/check.py "<out>/<pdf-stem>.md"
```

Fix every ERROR and re-run until it passes. A missing-lines error means text was dropped; the output lists the lines. Only if the user asked you to remove draft leftovers or other text, add `--allow-missing`. Treat WARNINGs as a checklist: fix or consciously accept each one.

## 8. Clean up and report

Delete `<out>/_work/` unless the user wants it. Tell the user, briefly:
- where the file is and its outline (the H2s),
- images kept / dropped, total image size before → after, and any size hints you overrode,
- **Needs your eye:** suspected typos, duplicated or abandoned draft sentences, empty sections, images you couldn't read, any heading you had to infer (including the H1 if the PDF had no title).
