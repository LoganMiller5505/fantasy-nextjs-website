#!/usr/bin/env python3
# /// script
# dependencies = ["pymupdf"]
# ///
"""
Stage 1 of pdf-to-markdown: pull everything out of a PDF in reading order.

    python3 extract.py input.pdf [--out DIR] [--dpi 150] [--render-all]

Writes (default DIR = <pdf folder>/<pdf stem>/):
  DIR/images/              extracted images, deduplicated (the final Markdown links here)
  DIR/_work/layout.md      ordered text lines + image placeholders, page by page
  DIR/_work/manifest.json  image inventory, body font size, outline, flags
  DIR/_work/pages/         full-page renders for pages that need a visual check
"""
import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

try:
    import pymupdf as fitz  # PyMuPDF >= 1.24
except ImportError:
    try:
        import fitz  # older PyMuPDF
    except ImportError:
        sys.exit("PyMuPDF is not installed. Run: pip install pymupdf")

MIN_IMG_PT = 18        # images shown smaller than this (points) are icons/bullets: skipped
BAND = 0.07            # top/bottom fraction of the page searched for running headers/footers
CROP_TOLERANCE = 0.03  # shown vs native aspect-ratio drift that means "image is cropped"
PAGE_NO = re.compile(r"^(page\s*)?#(\s*(of|/)\s*#)?$|^[-–—]\s*#\s*[-–—]$")


# ---------- text ----------

def is_bold(span):
    font = span["font"].lower()
    return bool(span["flags"] & 16) or "bold" in font or "black" in font


def is_italic(span):
    font = span["font"].lower()
    return bool(span["flags"] & 2) or "italic" in font or "oblique" in font


def styled(span):
    text = span["text"]
    core = text.strip()
    if not core:
        return text
    b, i = is_bold(span), is_italic(span)
    if b and i:
        core = f"***{core}***"
    elif b:
        core = f"**{core}**"
    elif i:
        core = f"*{core}*"
    lead = text[: len(text) - len(text.lstrip())]
    trail = text[len(text.rstrip()):]
    return lead + core + trail


def merge_marks(s):
    """'**THE** **CHIP**' -> '**THE CHIP**'"""
    s = re.sub(r"(?<!\*)\*\*\*(\s*)\*\*\*(?!\*)", r"\1", s)
    s = re.sub(r"(?<!\*)\*\*(\s*)\*\*(?!\*)", r"\1", s)
    return s


def page_lines(page):
    d = page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT, sort=True)
    lines = []
    for block in d["blocks"]:
        for ln in block.get("lines", []):
            spans = [s for s in ln["spans"] if s["text"]]
            raw = "".join(s["text"] for s in spans).strip()
            if not raw:
                continue
            visible = [s for s in spans if s["text"].strip()]
            chars = sum(len(s["text"].strip()) for s in visible) or 1
            bold_chars = sum(len(s["text"].strip()) for s in visible if is_bold(s))
            lines.append({
                "text": merge_marks("".join(styled(s) for s in spans)).strip(),
                "raw": raw,
                "bbox": tuple(ln["bbox"]),
                "size": max(round(s["size"], 1) for s in visible),
                "chars": chars,
                "bold": bold_chars / chars > 0.9,
            })
    return lines


def norm(s):
    return re.sub(r"\d+", "#", s.lower()).strip()


def in_band(bbox, h):
    return bbox[3] < h * BAND or bbox[1] > h * (1 - BAND)


def find_running(all_lines, heights):
    """Lines repeated in the top/bottom band of at least half the pages."""
    counts = Counter()
    for lines, h in zip(all_lines, heights):
        counts.update({norm(l["raw"]) for l in lines if in_band(l["bbox"], h)})
    n = len(all_lines)
    if n < 3:
        return set()
    return {k for k, c in counts.items() if c >= max(2, n * 0.5)}


# ---------- images ----------

def to_png(pix):
    if pix.colorspace and pix.colorspace.n >= 4:  # CMYK etc. -> RGB
        pix = fitz.Pixmap(fitz.csRGB, pix)
    return pix.tobytes("png")


def grab(doc, page, info, rect, smask, dpi):
    """Return (bytes, ext, method). Prefer original bytes; render the visible
    area when the image is cropped, clipped, or can't be extracted."""
    xref = info.get("xref") or 0
    w, h = info.get("width") or 0, info.get("height") or 0
    cropped = True
    if w and h and rect.height:
        native, shown = w / h, rect.width / rect.height
        drift = min(abs(shown - native) / native, abs(shown - 1 / native) * native)
        cropped = drift > CROP_TOLERANCE
    if xref and not cropped:
        try:
            if smask.get(xref):
                pix = fitz.Pixmap(fitz.Pixmap(doc, xref), fitz.Pixmap(doc, smask[xref]))
                return to_png(pix), "png", "original"
            img = doc.extract_image(xref)
            if img and img["ext"] in ("png", "jpeg", "jpg") and img.get("colorspace", 3) < 4:
                return img["image"], ("jpg" if img["ext"] == "jpeg" else img["ext"]), "original"
            return to_png(fitz.Pixmap(doc, xref)), "png", "original"
        except Exception:
            pass
    return to_png(page.get_pixmap(clip=rect, dpi=dpi)), "png", "rendered-as-shown"


def vector_regions(page, image_rects):
    """Clusters of vector drawings big enough to be a figure or a drawn table."""
    try:
        clusters = page.cluster_drawings()
    except Exception:
        return []
    area = page.rect.width * page.rect.height
    regions = []
    for r in clusters:
        r = fitz.Rect(r) & page.rect
        if r.is_empty or r.width < 40 or r.height < 40:
            continue
        if not (0.02 * area < r.get_area() < 0.85 * area):
            continue  # too small, or a page background
        if any((r & ir).get_area() > 0.8 * r.get_area() for ir in image_rects):
            continue  # just a border around an image
        regions.append(r)
    return regions


def text_column(all_lines, body, doc):
    """Width of the main text column in points: the author's '100%' for images."""
    x0s, x1s = Counter(), []
    for lines in all_lines:
        for l in lines:
            if abs(l["size"] - body) < 0.6 and l["chars"] > 20:
                x0s[round(l["bbox"][0])] += 1
                x1s.append(l["bbox"][2])
    if not x1s:
        return doc[0].rect.width - 144 if doc.page_count else 468.0
    x1s.sort()
    right = x1s[int(len(x1s) * 0.95)]  # a full line's right edge, ignoring outliers
    return max(right - x0s.most_common(1)[0][0], 100.0)


# ---------- layout ----------

def insert_visuals(lines, visuals):
    """Place images/figures among the lines by vertical position,
    preferring lines that overlap them horizontally (handles columns)."""
    items = [("line", l) for l in lines]
    for kind, v in sorted(visuals, key=lambda kv: (kv[1]["rect"].y0, kv[1]["rect"].x0)):
        r = v["rect"]
        line_idx = [i for i, (k, _) in enumerate(items) if k == "line"]
        cand = [i for i in line_idx
                if items[i][1]["bbox"][0] < r.x1 and items[i][1]["bbox"][2] > r.x0] or line_idx
        after = [i for i in cand if items[i][1]["bbox"][1] >= r.y0 - 2]
        pos = after[0] if after else (cand[-1] + 1 if cand else len(items))
        while pos < len(items) and items[pos][0] != "line":
            pos += 1
        items.insert(pos, (kind, v))
    return items


def tags(l, body, left, width, regions):
    t = []
    if l["size"] >= body * 1.15:
        t.append(f"{{H {l['size']:g}pt}}")
    elif l["size"] <= body * 0.85:
        t.append(f"{{small {l['size']:g}pt}}")
    x0, y0, x1, y1 = l["bbox"]
    if abs((x0 + x1) / 2 - width / 2) < 12 and (x1 - x0) < 0.7 * width and x0 > left + 30:
        t.append("{center}")
    elif x0 > left + 12:
        t.append("{indent}")
    center = fitz.Point((x0 + x1) / 2, (y0 + y1) / 2)
    if any(r.contains(center) for r in regions):
        t.append("{in-figure}")
    return (" ".join(t) + " ") if t else ""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf")
    ap.add_argument("--out", help="output folder (default: <pdf folder>/<pdf stem>)")
    ap.add_argument("--dpi", type=int, default=150, help="resolution for rendered crops and figures")
    ap.add_argument("--render-all", action="store_true", help="render every page to _work/pages/")
    args = ap.parse_args()

    pdf = Path(args.pdf).expanduser().resolve()
    if not pdf.exists():
        sys.exit(f"Not found: {pdf}")
    out = Path(args.out).expanduser().resolve() if args.out else pdf.parent / pdf.stem
    img_dir, work = out / "images", out / "_work"
    pages_dir = work / "pages"
    img_dir.mkdir(parents=True, exist_ok=True)
    pages_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf)
    if doc.needs_pass:
        sys.exit("The PDF is password-protected; ask the user for the password.")

    all_lines = [page_lines(p) for p in doc]
    heights = [p.rect.height for p in doc]
    running = find_running(all_lines, heights)
    size_chars = Counter()
    for lines in all_lines:
        for l in lines:
            size_chars[l["size"]] += l["chars"]
    body = size_chars.most_common(1)[0][0] if size_chars else 11.0
    column = text_column(all_lines, body, doc)

    manifest = {
        "source": str(pdf), "pages": doc.page_count, "body_font_pt": body,
        "text_column_pt": round(column),
        "metadata_title": (doc.metadata or {}).get("title") or None,
        "outline": [{"level": lvl, "title": t, "page": p} for lvl, t, p in doc.get_toc()],
        "removed_running_lines": {}, "flagged_pages": {}, "images": [], "figures": [],
        "skipped_tiny_images": 0,
    }
    removed = Counter()
    seen = {}  # sha1 -> filename
    out_lines = [f"<!-- source: {pdf.name} | {doc.page_count} pages | body text ≈ {body:g}pt -->"]
    if manifest["outline"]:
        hints = "; ".join(f"L{o['level']} {o['title']} (p.{o['page']})" for o in manifest["outline"][:200])
        out_lines.append(f"<!-- PDF outline, use as heading hints: {hints} -->")
    total_lines = 0

    for pno, page in enumerate(doc):
        W, H = page.rect.width, page.rect.height
        lines = []
        for l in all_lines[pno]:
            n = norm(l["raw"])
            if in_band(l["bbox"], H) and (n in running or PAGE_NO.match(n)):
                removed[l["raw"]] += 1
            else:
                lines.append(l)
        total_lines += len(lines)

        # images
        imgs, counter = [], 0
        smask = {it[0]: it[1] for it in page.get_images(full=True)}
        for info in page.get_image_info(xrefs=True):
            r = fitz.Rect(info["bbox"]) & page.rect
            if r.is_empty or r.width < MIN_IMG_PT or r.height < MIN_IMG_PT:
                manifest["skipped_tiny_images"] += 1
                continue
            data, ext, method = grab(doc, page, info, r, smask, args.dpi)
            digest = hashlib.sha1(data).hexdigest()
            dup = digest in seen
            if not dup:
                counter += 1
                seen[digest] = f"p{pno + 1:02d}-{counter:02d}.{ext}"
                (img_dir / seen[digest]).write_bytes(data)
            entry = {
                "file": seen[digest], "page": pno + 1, "duplicate": dup, "method": method,
                "bbox_pt": [round(v) for v in r], "shown_pt": [round(r.width), round(r.height)],
                "native_px": [info.get("width"), info.get("height")],
                "column_frac": round(r.width / column, 2),
            }
            manifest["images"].append(entry)
            imgs.append({"rect": r, "entry": entry})

        # vector figures
        figs = []
        for k, r in enumerate(vector_regions(page, [i["rect"] for i in imgs]), 1):
            name = f"p{pno + 1:02d}-v{k:02d}.png"
            (img_dir / name).write_bytes(page.get_pixmap(clip=r, dpi=args.dpi).tobytes("png"))
            entry = {"file": name, "page": pno + 1, "bbox_pt": [round(v) for v in r]}
            manifest["figures"].append(entry)
            figs.append({"rect": r, "entry": entry})
        regions = [f["rect"] for f in figs]

        # flags
        reasons = []
        img_area = sum(i["rect"].get_area() for i in imgs)
        if not lines and img_area > 0.4 * W * H:
            reasons.append("scanned")
        right = [l for l in lines if l["bbox"][0] > 0.45 * W and l["bbox"][2] - l["bbox"][0] < 0.5 * W]
        left_col = [l for l in lines if l["bbox"][2] < 0.55 * W]
        if len(right) >= 5 and len(left_col) >= 5:
            reasons.append("multi-column")
        if figs:
            reasons.append("vector-figure")
        if reasons:
            manifest["flagged_pages"][pno + 1] = reasons
        if reasons or args.render_all:
            page.get_pixmap(dpi=110).save(str(pages_dir / f"p{pno + 1:02d}.png"))

        # emit
        note = f" | check render _work/pages/p{pno + 1:02d}.png ({', '.join(reasons)})" if reasons else ""
        out_lines += ["", f"<!-- page {pno + 1} of {doc.page_count}{note} -->"]
        xs = Counter(round(l["bbox"][0]) for l in lines)
        left = xs.most_common(1)[0][0] if xs else 0
        prev = None
        visuals = [("img", i) for i in imgs] + [("fig", f) for f in figs]
        for kind, o in insert_visuals(lines, visuals):
            if kind == "line":
                if prev is not None:
                    gap = o["bbox"][1] - prev["bbox"][3]
                    if gap > 0.5 * (prev["bbox"][3] - prev["bbox"][1]):
                        out_lines.append("")
                out_lines.append(tags(o, body, left, W, regions) + o["text"])
                prev = o
            elif kind == "img":
                e = o["entry"]
                extra = " | duplicate of an earlier image (reuse the same file)" if e["duplicate"] else ""
                out_lines += ["", f"[[IMAGE images/{e['file']} | shown {e['shown_pt'][0]}x{e['shown_pt'][1]}pt"
                                  f" = {e['column_frac']:.0%} of text width | {e['method']}{extra}]]", ""]
                prev = None
            else:
                e = o["entry"]
                out_lines += ["", f"[[FIGURE images/{e['file']} | vector drawing rendered at {args.dpi}dpi"
                                  f" | text drawn inside it is tagged {{in-figure}}]]", ""]
                prev = None

    manifest["removed_running_lines"] = dict(removed.most_common(30))
    layout = re.sub(r"\n{3,}", "\n\n", "\n".join(out_lines)).strip() + "\n"
    (work / "layout.md").write_text(layout, encoding="utf-8")
    (work / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    unique = len({i["file"] for i in manifest["images"]})
    print(f"Pages: {doc.page_count} | text lines: {total_lines} | body font ≈ {body:g}pt")
    print(f"Images: {unique} unique, {len(manifest['images']) - unique} repeated uses, "
          f"{manifest['skipped_tiny_images']} tiny skipped | vector figures: {len(manifest['figures'])}")
    print(f"Removed running header/footer lines: {sum(removed.values())}")
    if manifest["flagged_pages"]:
        print("Pages to look at: " + ", ".join(f"p{p} ({', '.join(r)})" for p, r in manifest["flagged_pages"].items()))
    print(f"Layout:   {work / 'layout.md'}")
    print(f"Manifest: {work / 'manifest.json'}")
    print(f"Images:   {img_dir}")


if __name__ == "__main__":
    main()
