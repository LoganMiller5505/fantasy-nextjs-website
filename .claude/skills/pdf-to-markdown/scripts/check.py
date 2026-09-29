#!/usr/bin/env python3
# /// script
# dependencies = ["pymupdf"]
# ///
"""
Stage 3 of pdf-to-markdown: check the finished Markdown against the PDF.

    python3 check.py OUT/<stem>.md [--pdf input.pdf] [--min-coverage 0.97]

Finds the source PDF via OUT/_work/manifest.json unless --pdf is given.
ERRORs must be fixed; WARNINGs are a checklist. Exit code 1 if any ERROR.
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        sys.exit("PyMuPDF is not installed. Run: pip install pymupdf")

LEFTOVERS = [
    (re.compile(r"\[\[(IMAGE|FIGURE)\b"), "extractor placeholder left in"),
    (re.compile(r"<!--\s*(page|source|PDF outline)\b"), "extractor comment left in"),
    (re.compile(r"\{(H \d|small \d|indent\}|center\}|in-figure\})"), "layout tag left in"),
]


def words(text):
    text = unicodedata.normalize("NFKC", text).lower()
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)  # hyphenated wraps
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", text)


def md_text(md):
    t = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r" \1 ", md)       # keep alt text
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r" \1 ", t)          # links -> text
    t = re.sub(r"[*_`#>|]", " ", t)
    return t


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("md")
    ap.add_argument("--pdf")
    ap.add_argument("--min-coverage", type=float, default=0.97)
    ap.add_argument("--allow-missing", action="store_true",
                    help="user asked for cleanup: report missing lines as warnings, not errors")
    args = ap.parse_args()

    md_path = Path(args.md).expanduser().resolve()
    out = md_path.parent
    md = md_path.read_text(encoding="utf-8")
    manifest_path = out / "_work" / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    pdf_path = Path(args.pdf or manifest.get("source") or "")
    if not pdf_path.is_file():
        sys.exit("Can't find the source PDF; pass --pdf.")

    errors, warns = [], []
    body = re.sub(r"```.*?```", "", md, flags=re.S)  # ignore code blocks for structure checks
    lines = body.splitlines()

    # --- leftovers from stage 1
    for i, line in enumerate(lines, 1):
        for rx, msg in LEFTOVERS:
            if rx.search(line):
                errors.append(f"line {i}: {msg}: {line.strip()[:80]}")

    # --- headings
    heads = [(i, len(m.group(1)), m.group(2).strip())
             for i, l in enumerate(lines, 1) if (m := re.match(r"^(#{1,6})\s+(.*)$", l))]
    h1 = [h for h in heads if h[1] == 1]
    if len(h1) != 1:
        errors.append(f"expected exactly one H1, found {len(h1)}")
    prev = 0
    for i, lvl, text in heads:
        if prev and lvl > prev + 1:
            errors.append(f"line {i}: heading level jumps from H{prev} to H{lvl}: {text[:60]}")
        prev = lvl
        if text.endswith(":"):
            warns.append(f"line {i}: heading ends with ':' — {text[:60]}")
        if text.startswith("**") and text.endswith("**"):
            warns.append(f"line {i}: heading is wrapped in bold — {text[:60]}")
        if len(text) > 90:
            warns.append(f"line {i}: very long heading, may be a sentence — {text[:60]}…")
    for (i, lvl, text), nxt in zip(heads, heads[1:] + [(len(lines) + 1, 0, "")]):
        between = "\n".join(lines[i:nxt[0] - 1]).strip()
        if not between and nxt[1] <= lvl:
            warns.append(f"line {i}: empty section — {text[:60]}")
    if len(md) > 3000 and len(heads) < 3:
        warns.append("long document with fewer than 3 headings: structure probably not recovered")

    # --- images
    img_refs = re.findall(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)', body)
    linked = set()
    for alt, src, title in img_refs:
        linked.add(Path(src).name)
        if not (out / src).is_file():
            errors.append(f"broken image link: {src}")
        elif (out / src).stat().st_size > 400 * 1024:
            warns.append(f"{src} is {(out / src).stat().st_size // 1024}KB — run scripts/images.py")
        if title and title.strip().lower() not in {"small", "medium", "full"}:
            warns.append(f"{src} has title \"{title}\"; image titles are size hints: small, medium, or full")
        a = alt.strip().lower()
        if not a:
            errors.append(f"empty alt text: {src}")
        elif len(a) < 15 or a in {"image", "screenshot", "picture", "photo", "figure"} or Path(src).stem.lower() in a:
            warns.append(f"weak alt text for {src}: '{alt}'")
    img_dir = out / "images"
    if img_dir.is_dir():
        unused = sorted(p.name for p in img_dir.iterdir() if p.is_file() and p.name not in linked)
        if unused:
            warns.append("images not linked (fine only if decorative — say so in the report): " + ", ".join(unused))

    # --- unjoined hard wraps: consecutive non-blank prose lines
    for i in range(1, len(lines)):
        a, b = lines[i - 1], lines[i]
        if (a.strip() and b.strip() and not re.match(r"^\s*([-*+>|#]|\d+[.)]|!\[)", a)
                and not re.match(r"^\s*([-*+>|#]|\d+[.)]|!\[)", b)
                and not a.endswith("  ") and not a.endswith("\\") and len(a) > 50):
            warns.append(f"line {i}: looks like an unjoined line wrap: …{a[-40:]} / {b[:40]}…")

    # --- text coverage: every PDF word sequence should survive
    doc = fitz.open(pdf_path)
    removed = {k.lower() for k in manifest.get("removed_running_lines", {})}
    pdf_lines = []
    for page in doc:
        for l in page.get_text("text").splitlines():
            l = l.strip()
            if l and l.lower() not in removed and not re.fullmatch(r"\d{1,4}", l):
                pdf_lines.append(l)
    md_words = words(md_text(md))
    md_joined = " " + " ".join(md_words) + " "
    missing, total, hit = [], 0, 0
    for l in pdf_lines:
        w = words(l)
        if not w:
            continue
        total += len(w)
        if f" {' '.join(w)} " in md_joined:
            hit += len(w)
            continue
        # tolerate joins/splits: count the line as present if most of its 3-grams are
        grams = [" ".join(w[k:k + 3]) for k in range(max(1, len(w) - 2))]
        found = sum(1 for g in grams if f" {g} " in md_joined)
        if grams and found / len(grams) >= 0.8:
            hit += len(w)
        else:
            missing.append(l)
    coverage = hit / total if total else 1.0
    long_missing = [l for l in missing if len(words(l)) >= 6]
    if coverage < args.min_coverage:
        errors.append(f"text coverage {coverage:.1%} is below {args.min_coverage:.0%} — PDF text missing from the Markdown")
    elif long_missing and not args.allow_missing:
        errors.append(f"{len(long_missing)} full PDF line(s) missing from the Markdown (listed above) — restore them, "
                      f"or if they were intentionally removed at the user's request, re-run with --allow-missing")
    elif missing:
        warns.append(f"{len(missing)} short PDF line(s) not found verbatim (edited, reworded, or moved into a table?)")
    extra = len(md_words) - total
    if total and extra > 0.5 * total:
        warns.append(f"Markdown has {extra} more words than the PDF text layer (alt text is expected; "
                     f"rewriting is not)")

    # --- report
    print(f"Checked {md_path.name}: {len(heads)} headings, {len(img_refs)} image links, "
          f"text coverage {coverage:.1%} ({hit}/{total} words)")
    if missing:
        print("\nPDF lines not found in the Markdown:")
        for l in missing[:40]:
            print(f"  - {l[:100]}")
        if len(missing) > 40:
            print(f"  … and {len(missing) - 40} more")
    for e in errors:
        print(f"ERROR: {e}")
    for w in warns[:60]:
        print(f"WARNING: {w}")
    if len(warns) > 60:
        print(f"… and {len(warns) - 60} more warnings")
    print("\nPASS" if not errors else f"\nFAIL ({len(errors)} error(s))")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
