import type { APIRoute } from "astro"
import { medusaFetch, json } from "../../lib/server-medusa"
import { extractTracking } from "../../lib/tracking"

export const prerender = false

export const GET: APIRoute = async ({ url }) => {
  const order = url.searchParams.get("order") || ""
  const email = url.searchParams.get("email") || ""
  if (!order || !email) return json({ error: "Order number and email are required" }, 400)

  const tries = [
    `/store/orders?id=${encodeURIComponent(order)}&email=${encodeURIComponent(email)}`,
    `/store/orders?display_id=${encodeURIComponent(order)}&email=${encodeURIComponent(email)}`,
    `/store/orders/${encodeURIComponent(order)}`,
  ]
  for (const path of tries) {
    try {
      const { ok, data } = await medusaFetch(path)
      if (!ok) continue
      const found = data.order || data.orders?.[0]
      if (!found) continue
      if (found.email && String(found.email).toLowerCase() !== email.toLowerCase()) continue
      return json({
        order: {
          id: found.id,
          display_id: found.display_id || found.id,
          email: found.email,
          status: found.status || found.fulfillment_status || "processing",
          created_at: found.created_at,
          tracking: extractTracking(found),
        },
      })
    } catch { /* next */ }
  }
  return json({ error: "Order not found" }, 404)
}
