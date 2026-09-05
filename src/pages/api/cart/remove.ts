import type { APIRoute } from "astro"
import { getStoreSdk } from "../../../lib/medusa-config"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const { cartId, itemId } = await request.json()
    const medusa = getStoreSdk()
    await medusa.store.cart.deleteLineItem(cartId, itemId)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
