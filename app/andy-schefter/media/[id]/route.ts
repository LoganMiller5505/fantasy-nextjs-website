import type { NextRequest } from "next/server"
import { isMember } from "@/lib/poster"
import { getImage } from "@/lib/tweets"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// A tweet image straight from the database. The proxy already requires the site password here; this
// checks again in case the proxy's matcher ever changes. Images never change once posted, so the
// browser can keep them forever (privately, since they're behind the password).
export async function GET(_req: NextRequest, ctx: RouteContext<"/andy-schefter/media/[id]">) {
  if (!(await isMember())) return new Response("Unauthorized", { status: 401 })

  const { id } = await ctx.params
  const image = UUID.test(id) ? await getImage(id) : null
  if (!image) return new Response("Not found", { status: 404 })

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  })
}
