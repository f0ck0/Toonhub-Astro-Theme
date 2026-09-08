import type { APIRoute } from "astro"
import { clearAllCaches } from "../../lib/cache"

export const prerender = false

const KEY = import.meta.env.CACHE_PURGE_KEY || process.env.CACHE_PURGE_KEY || ""

function forbidden() {
  return new Response(JSON.stringify({ error: "forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  })
}

function ok(cleared: number) {
  return new Response(JSON.stringify({ ok: true, cleared }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

/** POST /api/cache-purge,请求头 x-purge-key: <CACHE_PURGE_KEY> */
export const POST: APIRoute = async ({ request }) => {
  const key = request.headers.get("x-purge-key") || ""
  if (!KEY || key !== KEY) return forbidden()
  return ok(clearAllCaches())
}

/** GET /api/cache-purge?key=<CACHE_PURGE_KEY>,便于命令行/后端直接调用 */
export const GET: APIRoute = async ({ url }) => {
  const key = url.searchParams.get("key") || ""
  if (!KEY || key !== KEY) return forbidden()
  return ok(clearAllCaches())
}
