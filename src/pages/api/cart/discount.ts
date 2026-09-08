import type { APIRoute } from "astro"
import { medusaFetch, json, errorMessage, medusaErrorMessage } from "../../../lib/server-medusa"

export const prerender = false

/** 购物车静默应用优惠码(Buy 1 get 2nd 50% off,无需顾客输入) */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { cartId?: string; code?: string }
    const cartId = String(body.cartId || "")
    const code = String(body.code || "")
    if (!cartId || !code) return json({ error: "cartId and code required" }, 400)
    const { ok, data } = await medusaFetch<{ cart?: unknown }>(
      `/store/carts/${encodeURIComponent(cartId)}/promotions`,
      { method: "POST", body: JSON.stringify({ promo_codes: [code] }) },
    )
    if (!ok) return json({ error: medusaErrorMessage(data, "Could not apply discount") }, 400)
    return json({ success: true, cart: data.cart })
  } catch (e) {
    return json({ error: errorMessage(e, "Could not apply discount") }, 500)
  }
}
