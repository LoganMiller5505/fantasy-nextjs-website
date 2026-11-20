// Shrinks images in the browser before upload, since Vercel caps request bodies at 4.5 MB. The
// server re-encodes them again; this only keeps uploads small.

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024 // matches MAX_UPLOAD_BYTES on the server
const MAX_EDGE = 2048

// A picked image file, fitted into 2048×2048. GIFs are sent as is so they stay animated.
export async function shrinkImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is over 3 MB.`)
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error(`Couldn't read ${file.name}.`)
  }
  try {
    return await drawToImage(bitmap, bitmap.width, bitmap.height, file.name)
  } finally {
    bitmap.close()
  }
}

// Anything drawable (an image, or a video's current frame) as a WebP fitted into 2048×2048
export async function drawToImage(source: CanvasImageSource, width: number, height: number, name: string): Promise<Blob> {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

  let blob = await toBlob(canvas, "image/webp")
  // Browsers that can't encode WebP hand back PNG instead; JPEG is much smaller. JPEG has no
  // transparency, so redraw on white first.
  if (blob?.type !== "image/webp") {
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    blob = await toBlob(canvas, "image/jpeg")
  }

  if (!blob) throw new Error(`Couldn't read ${name}.`)
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error(`${name} is too large even after shrinking.`)
  return blob
}

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
}
