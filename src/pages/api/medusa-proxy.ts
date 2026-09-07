import type { APIRoute } from "astro"
import { medusaFetch, json, errorMessage } from "../../lib/server-medusa"

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get("path") || ""
  if (!path.startsWith("/store")) return json({ error: "invalid path" }, 400)
  try {
    const { ok, status, data } = await medusaFetch(path, { signal: AbortSignal.timeout(5000) })
    return json(data, ok ? 200 : status)
  } catch (e) {
    return json({ error: errorMessage(e, "Medusa unreachable") }, 502)
  }
}
