import type { APIRoute } from "astro"
import { medusaFetch, json } from "../../lib/server-medusa"

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
      const tracking: { tracking_number?: string; url?: string }[] = []
      const pushTrack = (t: any) => {
        if (!t) return
        if (typeof t === "string") {
          if (t) tracking.push({ tracking_number: t })
          return
        }
        const num = t.tracking_number || t.number || t.tracking_numbers?.[0] || ""
        const href = t.url || t.tracking_url || ""
        if (num || href) tracking.push({ tracking_number: num, url: href })
      }
      for (const f of found.fulfillments || []) {
        for (const t of f.tracking_links || []) pushTrack(t)
        for (const t of f.labels || []) pushTrack(t)
        for (const n of f.tracking_numbers || []) pushTrack(n)
      }
      return json({
        order: {
          id: found.id,
          display_id: found.display_id || found.id,
          email: found.email,
          status: found.status || found.fulfillment_status || "processing",
          created_at: found.created_at,
          tracking,
        },
      })
    } catch { /* next */ }
  }
  return json({ error: "Order not found" }, 404)
}
