import type { APIRoute } from "astro"
import Medusa from "@medusajs/js-sdk"

export const prerender = false

const medusa = new Medusa({
  baseUrl: process.env.MEDUSA_URL || "http://localhost:9000",
  publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || "",
})

export const POST: APIRoute = async ({ request }) => {
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
    const { cart } = await medusa.store.cart.retrieve(cartId)
    return new Response(JSON.stringify({ items: cart.items || [], total: cart.total }), { headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ items: [] }), { headers: { "Content-Type": "application/json" } })
  }
}
