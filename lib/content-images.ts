import "server-only"
import sharp from "sharp"

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

// Re-encodes an image as WebP that fits in maxEdge×maxEdge. Doubles as the check that it really is
// an image (sharp throws on anything it can't decode) and gives the true size. Animated GIFs stay
// animated.
export async function normalizeImage(file: Blob | Buffer, maxEdge: number) {
  const input = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer())
  const animated = ((await sharp(input).metadata()).pages ?? 1) > 1

  let image = sharp(input, { animated, limitInputPixels: 50_000_000 })
  if (!animated) image = image.rotate() // applies EXIF orientation; not supported for multi-frame images
  const { data, info } = await image
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })

  // For animations, info.height is every frame stacked; pageHeight is one frame
  return { bytes: data, width: info.width, height: info.pageHeight ?? info.height, mime: "image/webp" as const }
}
