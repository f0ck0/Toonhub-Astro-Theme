import type { APIRoute } from "astro"
import Medusa from "@medusajs/js-sdk"

export const prerender = false

const medusa = new Medusa({
  baseUrl: process.env.MEDUSA_URL || "http://localhost:9000",
  publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || "",
})

function mapItems(cart: any) {
  return (cart?.items || []).map((i: any) => ({
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

export const POST: APIRoute = async () => {
  try {
    const { cart } = await medusa.store.cart.create({})
    return new Response(JSON.stringify({ cartId: cart.id }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}

export const GET: APIRoute = async ({ url }) => {
  const cartId = url.searchParams.get("cartId")
  if (!cartId) return new Response(JSON.stringify({ items: [] }), { headers: { "Content-Type": "application/json" } })
  try {
    const { cart } = await medusa.store.cart.retrieve(cartId, { fields: "*items,*items.variant,*items.product" })
    return new Response(JSON.stringify({ items: mapItems(cart), total: cart.total }), { headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ items: [] }), { headers: { "Content-Type": "application/json" } })
  }
}
