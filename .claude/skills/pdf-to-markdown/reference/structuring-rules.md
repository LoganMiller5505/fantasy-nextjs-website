# Structuring rules

Read this before deciding the outline. The goal: someone skimming the Markdown's headings can navigate the document, and nothing the author wrote is lost.

## Headings

**Signals, strongest first:**
1. The PDF outline in `manifest.json` (if present): use its titles and levels.
2. Font size: `{H nn pt}` lines, larger = higher level.
3. Patterns, when every line is body size (common in exported Google/Word docs):
   - A short line (< ~70 chars) standing alone between blank lines, not ending in `.` `,` `;`
   - A line ending in `:` that introduces a section rather than a list (`Week 1:`, `Standings:`)
   - `X vs Y` / `X vs. Y` lines (matchups, comparisons)
   - `Week N`, `Chapter N`, `Part N`, `Section N`, numbered `1.` / `1.2` titles
   - Whole-line `**bold**`, especially ALL CAPS
   - A label immediately followed by an image or table (`Standings:` + standings screenshot)

**Levels:**
- H1 = document title. Use the title line if one exists; else `metadata_title`; else infer one from the content and list it under "Needs your eye". Exactly one H1.
- The biggest recurring division is H2 (weeks, chapters, parts), the next is H3 (matchups within a week), then H4. Never skip a level.
- The same pattern gets the same level everywhere. If `Week 1:` is H2, `Week 2:` is H2 even if it looks different.
- Remove the trailing `:` and bold markers from headings. Keep the author's wording and capitalization otherwise.
- A line that merely *looks* like a heading but continues a sentence (`As for the Punters` followed by stats) is a lead-in sentence or a bold label, not a heading; judge by what follows it.

**Bold-only blocks** (e.g. a stack of `**BREAKING NEWS.**` lines) are usually a callout, not a heading stack. Make the first meaningful line the heading (`### Trade Alert`) if it starts a new topic, and render the rest as a paragraph or blockquote with the bold kept.

## Paragraphs and line breaks

- Consecutive lines with no blank line between them are one paragraph: join with a space.
- Join across a `<!-- page N -->` marker when the previous page ends mid-sentence (no terminal `.!?:"”)`) or the next page starts lowercase.
- Hyphenation: `inter-` + `national` → `international` only when the joined word is a real word; keep real compounds (`well-known`).
- Missing space after a period when two sentences were glued (`carrer.Travis`) is an extraction artifact only if the PDF text shows it that way everywhere; otherwise leave it and flag it.
- Short lines that are deliberately separate (dialogue, a line-per-item list without bullets, a punchline on its own) stay separate paragraphs. Blank lines in `layout.md` are the evidence.

## Lists

- `A)`, `B)`, `1.`, `•`, `-`, `–` at line start → Markdown list (`-` or `1.`). Keep the author's labels when they matter (`A)` → `- **A)** …` or an ordered list).
- Parallel short lines under a label (`Most points for: Punts 304.08`, `Least points for: …`) → bullet list with the label bolded, or a two-column table if there are 4+ rows of the same shape.
- A run of `Name? Adjective.` lines can stay as short paragraphs; don't over-listify prose.

## Tables

- Text laid out in aligned columns → Markdown table.
- A screenshot of a table (standings, stats, schedule) → keep the image; don't rebuild it as a Markdown table. The alt text summarizes it (what it lists, and the leader or headline if obvious).

## Images

Placement: put the image where it sits in the reading flow, right after the text that introduces it.

Formats:

A visible image speaks for itself: don't repeat its contents as Markdown under it. What the reader can't get from the picture — when it fails to load, or with a screen reader — goes in the alt text, one sentence:

```markdown
![Score card: Team A 75.76 vs Team B 136.32; Team B wins](images/p01-01.png)
```

- Score cards / matchup results → both teams, both scores, the winner.
- Trades / transactions → who traded with whom and the headline players.
- Charts / tables → what it shows and the takeaway (the leader, the trend), not every value.
- Social posts / chat screenshots → the author and the gist or punchline of the text.
- Memes and photos → the joke or scene, including any caption text.
- Duplicate images (`duplicate` in the placeholder) → reuse the same file path and alt text.
- `{in-figure}` text belongs to a `[[FIGURE]]`: don't also emit it as body text; put it into the figure's alt text (the verifier counts alt text as present).

Body-text transcription is only for content that won't appear as an image — see step 3 of SKILL.md.

### Image sizing

The image title is reserved for a size hint: `![alt](src "small")`, `"medium"`, or `"full"`; no title means full. `scripts/images.py` sets it from the PDF layout; set it yourself only to override. Don't put captions or other text in the title — captions go in the alt text or a line below.

Override when the role matters more than the layout:
- **Readable data wins:** a screenshot whose text must be read (standings, stat tables, trade cards) should display its text at roughly body size, even if the author made it small — nothing is transcribed below it, so the picture is the only way to read it. Estimate: text height in the image × (display width ÷ image width) should be ≥ ~12px; bump `"small"` to `"medium"` or `"full"` until it is, but not past the image's own pixel width (the script warns when a hint would upscale).
- **Jokes can shrink:** memes, reaction images, and team logos rarely need more than `"small"`, even when the author pasted them full-width.
- **Consistency:** a recurring kind of image (every score card, every team logo) gets the same size throughout.

For renderers that should honor the hint, map the title to a width and drop the tooltip. With react-markdown:

```tsx
img: ({ title, ...props }) => <img {...props} data-size={title} />
```

```css
.typeset img[data-size="small"]  { width: min(100%, 20rem); display: block; margin-inline: auto; }
.typeset img[data-size="medium"] { width: min(100%, 32rem); display: block; margin-inline: auto; }
```

## Things that break structure in "poorly structured" PDFs

- **Orphaned labels:** a label at the bottom of a page and its content (image, list) at the top of the next. Reattach. Example: `Worst Game:` then page break then a score card.
- **Label + value split by an image:** `Closest game: 1` followed by the score card that proves it. Keep them together as one list item with the image under it.
- **Draft leftovers:** duplicated or half-rewritten sentences (an older version of the next sentence left in). Keep them verbatim (fidelity rule) and list them under "Needs your eye". If the user asked for cleanup, remove the older version.
- **Running headers/footers and page numbers:** already removed by the extractor (see `removed_running_lines`). Double-check nothing real was removed.
- **Emphasis split across lines:** `**THE**` / `**CHIP**` → `**THE CHIP**`.
- **Scanned pages:** transcribe from the page render; mark uncertain words with `[?]` and list them in the report.

## Final shape

```markdown
# Title

Intro paragraphs…

## Section (e.g. Week 1)

### Subsection (e.g. Team A vs Team B)

Paragraphs, images, lists…
```

No HTML except `<br>` where a line break inside a table cell is unavoidable. No `<!-- page -->` markers, `[[IMAGE]]` placeholders, or layout tags in the output.
