import type { APIRoute } from "astro"
import { medusaFetch, json } from "../../lib/server-medusa"

export const prerender = false

function bearer(request: Request) {
  return request.headers.get("authorization") || ""
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

async function loadMe(auth: string) {
  const me = await medusaFetch("/store/customers/me", {}, { Authorization: auth })
  return me
}

async function loadOrders(auth: string) {
  const tries = [
    "/store/orders?limit=20",
    "/store/customers/me/orders?limit=20",
    "/store/orders?offset=0&limit=20",
  ]
  for (const path of tries) {
    try {
      const res = await medusaFetch(path, {}, { Authorization: auth })
      if (res.ok) {
        const list = ordersOf(res.data)
        if (list.length || res.data?.orders) return list
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

export const GET: APIRoute = async ({ request }) => {
  const auth = bearer(request)
  if (!auth) return json({ error: "Not signed in" }, 401)
  try {
    const me = await loadMe(auth)
    if (me.status === 401 || me.status === 403) return json({ error: "Session expired" }, 401)
    if (!me.ok) return json({ error: me.data?.message || "Could not load account" }, 502)
    const customer = customerOf(me.data)
    const [orders, addresses] = await Promise.all([
      loadOrders(auth),
      loadAddresses(auth, customer),
    ])
    return json({ customer, orders, addresses })
  } catch (e: any) {
    return json({ error: e.message || "Could not reach store" }, 502)
  }
}

export const POST: APIRoute = async ({ request }) => {
  const auth = bearer(request)
  if (!auth) return json({ error: "Not signed in" }, 401)
  try {
    const body = await request.json()
    const payload: Record<string, string> = {}
    if (body.first_name != null) payload.first_name = String(body.first_name).trim()
    if (body.last_name != null) payload.last_name = String(body.last_name).trim()
    if (body.phone != null) payload.phone = String(body.phone).trim()
    const upd = await medusaFetch(
      "/store/customers/me",
      { method: "POST", body: JSON.stringify(payload) },
      { Authorization: auth },
    )
    if (upd.status === 401 || upd.status === 403) return json({ error: "Session expired" }, 401)
    if (!upd.ok) return json({ error: upd.data?.message || "Could not save profile" }, 400)
    return json({ customer: customerOf(upd.data) })
  } catch (e: any) {
    return json({ error: e.message || "Could not save profile" }, 502)
  }
}
