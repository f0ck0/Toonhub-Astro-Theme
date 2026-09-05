import type { APIRoute } from "astro"
import Medusa from "@medusajs/js-sdk"

export const prerender = false

const medusa = new Medusa({
  baseUrl: process.env.MEDUSA_URL || "http://localhost:9000",
  publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || "",
})

export const POST: APIRoute = async ({ request }) => {
  try {
    const { cartId, variantId, quantity } = await request.json()
    const { cart } = await medusa.store.cart.createLineItem(cartId, { variant_id: variantId, quantity })
    return new Response(JSON.stringify({ success: true, cart }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
