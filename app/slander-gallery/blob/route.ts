import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { isEditor } from "@/lib/editor"
import { VIDEO_TYPES } from "@/lib/gallery-shared"

// Hands the browser a short-lived token to upload one gallery video straight to Vercel Blob, since
// videos are too big to pass through a function. Only editors get one. The gallery row is added
// afterwards by addGalleryItem, which checks the upload really landed in our store.
export async function POST(request: Request) {
  if (!(await isEditor())) return NextResponse.json({ error: "Not an editor" }, { status: 401 })
  const body = (await request.json()) as HandleUploadBody
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("slander-gallery/")) throw new Error("Wrong folder")
        return {
          allowedContentTypes: VIDEO_TYPES,
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true, // the URL is public, so make it unguessable
        }
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
