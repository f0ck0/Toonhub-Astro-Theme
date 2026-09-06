import type { APIRoute } from "astro"
import { getStoreSdk } from "../../../lib/medusa-config"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const { cartId, variantId, quantity } = await request.json()
    const medusa = getStoreSdk()
    const { cart } = await medusa.store.cart.createLineItem(cartId, { variant_id: variantId, quantity })
    return new Response(JSON.stringify({ success: true, cart }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
