import type { APIRoute } from "astro"
import { medusaFetch, json } from "../../lib/server-medusa"
import { extractTracking, orderTrackStatus } from "../../lib/tracking"

export const prerender = false

function bearer(request: Request, cookies: any) {
  const h = request.headers.get("authorization") || ""
  if (h) return h.startsWith("Bearer ") || h.startsWith("bearer ") ? h : `Bearer ${h}`
  const token = cookies.get("toonhub_token")?.value || ""
  return token ? `Bearer ${token}` : ""
}

function customerOf(data: any) {
  return data?.customer || data?.customer_customer || data
}

function ordersOf(data: any): any[] {
  if (!data) return []
  if (Array.isArray(data.orders)) return data.orders
  if (Array.isArray(data.order)) return data.order
  if (Array.isArray(data.data)) return data.data
  return []
}

function addressesOf(customer: any, data: any): any[] {
  const fromCust = customer?.addresses || customer?.shipping_addresses || []
  const fromApi = data?.addresses || data?.shipping_addresses || []
  return Array.isArray(fromApi) && fromApi.length ? fromApi : (Array.isArray(fromCust) ? fromCust : [])
}

function slimOrder(o: any) {
  const items = o.items || o.line_items || []
  return {
    id: o.id,
    display_id: o.display_id || o.id,
    email: o.email,
    created_at: o.created_at,
    status: orderTrackStatus(o),
    fulfillment_status: o.fulfillment_status || "",
    total: o.total ?? o.summary?.total ?? 0,
    currency_code: o.currency_code || o.currency || "usd",
    items: items.map((i: any) => ({ title: i.title, quantity: i.quantity, thumbnail: i.thumbnail || i.variant?.product?.thumbnail || "" })),
    tracking: extractTracking(o),
  }
}

async function loadMe(auth: string) {
  return medusaFetch("/store/customers/me", {}, { Authorization: auth })
}

async function loadOrders(auth: string) {
  const tries = [
    "/store/orders?limit=20&fields=*fulfillments,*fulfillments.labels,*items,+display_id,+email,+status,+fulfillment_status,+created_at,+total,+currency_code",
    "/store/orders?limit=20",
    "/store/customers/me/orders?limit=20",
  ]
  for (const path of tries) {
    try {
      const res = await medusaFetch(path, {}, { Authorization: auth })
      if (res.ok) {
        const list = ordersOf(res.data)
        if (list.length || res.data?.orders) return list.map(slimOrder)
      }
    } catch { /* next */ }
  }
  return []
}

async function loadAddresses(auth: string, customer: any) {
  try {
    const res = await medusaFetch("/store/customers/me/addresses", {}, { Authorization: auth })
    if (res.ok) return addressesOf(customer, res.data)
  } catch { /* fallback */ }
  return addressesOf(customer, null)
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const auth = bearer(request, cookies)
  if (!auth) return json({ error: "Not signed in" }, 401)
  try {
    const me = await loadMe(auth)
    if (me.status === 401 || me.status === 403) {
      return json({ error: "Session expired", keep_local: true }, 200)
    }
    if (!me.ok) return json({ error: me.data?.message || "Could not load account", keep_local: true }, 200)
    const customer = customerOf(me.data)
    const [orders, addresses] = await Promise.all([
      loadOrders(auth),
      loadAddresses(auth, customer),
    ])
    return json({ customer, orders, addresses })
  } catch (e: any) {
    return json({ error: e.message || "Could not reach store", keep_local: true }, 200)
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = bearer(request, cookies)
  if (!auth) return json({ error: "Not signed in" }, 401)
  try {
    const body = await request.json()
    if (body.action === "logout") {
      cookies.delete("toonhub_token", { path: "/" })
      cookies.delete("toonhub_email", { path: "/" })
      cookies.delete("toonhub_signed_in", { path: "/" })
      return json({ ok: true })
    }
    const payload: Record<string, string> = {}
    if (body.first_name != null) payload.first_name = String(body.first_name).trim()
    if (body.last_name != null) payload.last_name = String(body.last_name).trim()
    if (body.phone != null) payload.phone = String(body.phone).trim()
    const upd = await medusaFetch(
      "/store/customers/me",
      { method: "POST", body: JSON.stringify(payload) },
      { Authorization: auth },
    )
    if (!upd.ok) return json({ error: upd.data?.message || "Could not save profile" }, 400)
    return json({ customer: customerOf(upd.data) })
  } catch (e: any) {
    return json({ error: e.message || "Could not save profile" }, 502)
  }
}
