#!/usr/bin/env python3
# /// script
# dependencies = ["pillow"]
# ///
"""
Stage 2b of pdf-to-markdown: size, resize, and re-encode the linked images.

    python3 images.py OUT/<stem>.md [--column-px 768] [--dry-run]

For every image the Markdown links, it:
  1. picks a display size: small / medium / full, from how wide the author
     placed it in the PDF (manifest `column_frac`), capped so tall images
     don't fill the screen and low-res images aren't blown up;
  2. resizes the file to 2x that display width (sharp on retina, never upscaled);
  3. re-encodes it: photos -> JPEG, flat graphics/screenshots -> optimized PNG
     (palette PNG when lossless), transparency kept only when it is used;
  4. rewrites the link as ![alt](images/x.jpg "small"). Full width gets no title.

A title already set to small/medium/full is an override and is kept as is.
Originals are cached in OUT/_work/originals/, so re-running never degrades.
"""
import argparse
import io
import json
import re
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is not installed. Run: pip install pillow  (or: uv run images.py …)")

SIZES = {"small": 5 / 12, "medium": 2 / 3, "full": 1.0}  # share of the column: 320/512/768px at 768
ORDER = ["full", "medium", "small"]
DENSITY = 2            # pixels per CSS pixel to keep
MAX_HEIGHT = 0.85      # tallest display height, as a share of the column width
PHOTO_COLORS = 3000    # distinct colors in a 128px thumbnail above which an image is photographic
FLAT_COLORS = 1000     # ...and below which it is flat enough to palettize
JPEG_QUALITY = 82
LINK = re.compile(r'!\[(?P<alt>[^\]]*)\]\((?P<src>[^)\s]+)(?:\s+"(?P<title>[^"]*)")?\)')


def pick_size(w, h, frac, column):
    """Return (size, why) for an image w x h px shown at `frac` of the text column."""
    if frac is None:
        size, why = "full", "no PDF layout info"
    elif frac >= 0.8:
        size, why = "full", f"{frac:.0%} of text width in PDF"
    elif frac >= 0.5:
        size, why = "medium", f"{frac:.0%} of text width in PDF"
    else:
        size, why = "small", f"{frac:.0%} of text width in PDF"
    i = ORDER.index(size)
    while i < 2 and SIZES[ORDER[i]] * column * h / w > MAX_HEIGHT * column:
        i, why = i + 1, f"tall ({w}x{h})"
    while i < 2 and w < SIZES[ORDER[i]] * column * 0.9:
        i, why = i + 1, f"low-res ({w}px wide)"
    return ORDER[i], why


def uses_alpha(im):
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        return im.convert("RGBA").getchannel("A").getextrema()[0] < 250
    return False


def is_photo(im):
    thumb = im.convert("RGB")
    thumb.thumbnail((128, 128))
    colors = thumb.getcolors(128 * 128)
    return len(colors) > PHOTO_COLORS


def flat(im):
    """Few distinct colors (UI screenshot, chart, logo) — safe to palettize."""
    thumb = im.convert("RGB")
    thumb.thumbnail((128, 128))
    return len(thumb.getcolors(128 * 128)) < FLAT_COLORS


def png(im):
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def encode(im, src_ext, src_bytes, resized):
    """Return (bytes, ext, kind). Keeps the source bytes when they are already the best choice."""
    alpha = uses_alpha(im)
    photo = not alpha and (src_ext in (".jpg", ".jpeg") or is_photo(im))
    if photo:
        if src_ext in (".jpg", ".jpeg") and not resized:
            return src_bytes, ".jpg", "photo, kept as-is"  # re-encoding a JPEG only loses quality
        buf = io.BytesIO()
        im.convert("RGB").save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        return buf.getvalue(), ".jpg", "photo → JPEG"
    im = im.convert("RGBA" if alpha else "RGB")
    note = " (alpha kept)" if alpha else ""
    candidates = [(png(im), "graphic → PNG" + note)]
    if im.getcolors(256) or flat(im):
        # Flat UI (score cards, tables, logos): 256 colors is visually lossless and far smaller.
        method = Image.Quantize.FASTOCTREE if alpha else Image.Quantize.MEDIANCUT
        candidates.append((png(im.quantize(256, method=method, dither=Image.Dither.NONE)),
                           "graphic → palette PNG" + note))
    if src_ext == ".png" and (not resized or len(src_bytes) < min(len(c[0]) for c in candidates)):
        # Smaller source wins even at a higher resolution: it is sharper and lighter.
        candidates.append((src_bytes, "graphic, kept as-is"))
    data, kind = min(candidates, key=lambda c: len(c[0]))
    return data, ".png", kind


def kb(n):
    return f"{n / 1024:,.0f}KB"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("md")
    ap.add_argument("--column-px", type=int, default=768,
                    help="width of the page's text column in CSS px (default 768 = 48rem)")
    ap.add_argument("--dry-run", action="store_true", help="report decisions without writing anything")
    args = ap.parse_args()

    md_path = Path(args.md).expanduser().resolve()
    out = md_path.parent
    md = md_path.read_text(encoding="utf-8")
    manifest_path = out / "_work" / "manifest.json"
    fracs = {}
    if manifest_path.exists():
        for e in json.loads(manifest_path.read_text()).get("images", []):
            if "column_frac" in e:
                fracs[e["file"]] = max(fracs.get(e["file"], 0), e["column_frac"])
    originals = out / "_work" / "originals"
    column = args.column_px

    # every distinct src, with the hint (title) set on any of its links
    hints = {}
    for m in LINK.finditer(md):
        t = (m["title"] or "").strip().lower()
        hints.setdefault(m["src"], None)
        if t in SIZES:
            hints[m["src"]] = t

    renames, sizes, rows = {}, {}, []
    before_total = after_total = 0
    for src, hint in hints.items():
        path = out / src
        if src.startswith(("http:", "https:", "/")) or not path.is_file():
            continue
        # by stem: the working file may have been renamed .png -> .jpg on an earlier run
        cached = next(originals.glob(f"{path.stem}.*"), None) if originals.is_dir() else None
        source = cached or path
        src_bytes = source.read_bytes()
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(src_bytes)))
        w, h = im.size

        if hint:
            size, why = hint, "set in Markdown"
            if w < SIZES[size] * column * 0.9:
                why += f"; only {w}px wide, will look soft — consider a smaller hint"
        else:
            size, why = pick_size(w, h, fracs.get(path.name), column)
        target_w = min(w, round(SIZES[size] * column * DENSITY))
        resized = target_w < w
        if resized:
            im = im.resize((target_w, round(h * target_w / w)), Image.LANCZOS)
        data, ext, kind = encode(im, source.suffix.lower(), src_bytes, resized)

        new_path = path.with_suffix(ext)
        new_src = str(Path(src).with_suffix(ext))
        before_total += path.stat().st_size
        after_total += len(data)
        rows.append(f"  {path.name:<14} → {new_path.name:<14} {w}x{h} {kb(path.stat().st_size):>8} → "
                    f"{im.size[0]}x{im.size[1]} {kb(len(data)):>7}  {size:<6} ({why}; {kind})")
        sizes[src] = size
        if new_src != src:
            renames[src] = new_src
        if args.dry_run:
            continue
        if not cached:
            originals.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, originals / path.name)
        new_path.write_bytes(data)
        if new_path != path:
            path.unlink()

    def relink(m):
        src = m["src"]
        if src not in sizes:
            return m[0]
        title = f' "{sizes[src]}"' if sizes[src] != "full" or hints[src] == "full" else ""
        return f"![{m['alt']}]({renames.get(src, src)}{title})"

    if not args.dry_run:
        md_path.write_text(LINK.sub(relink, md), encoding="utf-8")

    print(f"Images ({'dry run, nothing written' if args.dry_run else 'rewritten'}), column {column}px:")
    print("\n".join(rows) or "  (no local images linked)")
    if before_total:
        change = after_total / before_total - 1
        print(f"Total: {kb(before_total)} → {kb(after_total)} ({abs(change):.0%} {'larger' if change > 0 else 'smaller'})")
    if renames:
        print("Renamed (links updated): " + ", ".join(f"{Path(a).name}→{Path(b).name}" for a, b in renames.items()))


if __name__ == "__main__":
    main()
