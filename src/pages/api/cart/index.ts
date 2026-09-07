import type { APIRoute } from "astro"
import { getStoreSdk } from "../../../lib/medusa-config"
import { errorMessage } from "../../../lib/server-medusa"
import type { MedusaCart, MedusaCartItem, MedusaRegion } from "../../../types"

export const prerender = false

function mapItems(cart: MedusaCart | null | undefined) {
  return (cart?.items || []).map((i: MedusaCartItem) => ({
    id: i.id,
    title: i.title,
    thumbnail: i.thumbnail,
    variant_id: i.variant_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    handle: i.product?.handle || i.variant?.product?.handle || "",
    variant_title: i.variant_title || i.variant?.title || "",
  }))
}

function jsonOk(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } })
}

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const currency = (cookies.get("toonhub_currency")?.value || "usd").toLowerCase()
    let regionId: string | undefined
    const medusa = getStoreSdk()
    try {
      const { regions } = await medusa.store.region.list({ limit: 20 })
      const match = (regions as MedusaRegion[] | undefined || []).find(
        (r) => r.currency_code?.toLowerCase() === currency,
      )
      regionId = match?.id || (regions as MedusaRegion[] | undefined)?.[0]?.id
    } catch { /* region optional */ }
    const { cart } = await medusa.store.cart.create(regionId ? { region_id: regionId } : {})
    return jsonOk({ cartId: cart.id, region_id: cart.region_id })
  } catch (e) {
    return new Response(JSON.stringify({ error: errorMessage(e) }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}

export const GET: APIRoute = async ({ url }) => {
  const cartId = url.searchParams.get("cartId")
  if (!cartId) return jsonOk({ items: [] })
  try {
    const medusa = getStoreSdk()
    const { cart } = await medusa.store.cart.retrieve(cartId, {
      fields: "*items,*items.variant,*items.product,+total,+subtotal,+shipping_total,+discount_total",
    })
    return jsonOk({ items: mapItems(cart as MedusaCart), total: cart.total, cart })
  } catch {
    return jsonOk({ items: [] })
  }
}
