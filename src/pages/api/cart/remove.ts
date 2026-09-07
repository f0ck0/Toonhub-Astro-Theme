import type { APIRoute } from "astro"
import { getStoreSdk } from "../../../lib/medusa-config"
import { errorMessage } from "../../../lib/server-medusa"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const { cartId, itemId } = await request.json()
    const medusa = getStoreSdk()
    await medusa.store.cart.deleteLineItem(cartId, itemId)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: errorMessage(e) }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
