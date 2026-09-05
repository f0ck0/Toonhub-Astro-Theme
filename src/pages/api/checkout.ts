import type { APIRoute } from "astro"
import Medusa from "@medusajs/js-sdk"
import { medusaFetch, json, medusaEnv, providerLabel } from "../../lib/server-medusa"

export const prerender = false

const sdk = new Medusa({
  baseUrl: process.env.MEDUSA_URL || "http://localhost:9000",
  publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || "",
})

const CART_FIELDS = "*items,*items.variant,*items.product,*shipping_address,*billing_address,*shipping_methods,*payment_collection,*payment_collection.payment_sessions,+email,+total,+subtotal,+shipping_total,+discount_total,+tax_total,+currency_code,*region"

function mapCart(cart: any) {
  if (!cart) return null
  return {
    id: cart.id,
    email: cart.email,
    currency: cart.currency_code || cart.region?.currency_code || "usd",
    total: cart.total,
    subtotal: cart.subtotal,
    shipping_total: cart.shipping_total,
    discount_total: cart.discount_total,
    tax_total: cart.tax_total,
    shipping_address: cart.shipping_address,
    shipping_methods: cart.shipping_methods || [],
    payment_collection: cart.payment_collection,
    items: (cart.items || []).map((i: any) => ({
      id: i.id,
      title: i.title,
      thumbnail: i.thumbnail,
      quantity: i.quantity,
      unit_price: i.unit_price,
      variant_title: i.variant_title || i.variant?.title || "",
      handle: i.product?.handle || "",
    })),
  }
}

async function retrieveCart(cartId: string) {
  try {
    const { cart } = await sdk.store.cart.retrieve(cartId, { fields: CART_FIELDS })
    if (cart) return cart
  } catch { /* REST fallback */ }
  const { ok, data } = await medusaFetch(`/store/carts/${cartId}?fields=${encodeURIComponent(CART_FIELDS)}`)
  if (!ok) throw new Error(data?.message || "Cart not found")
  return data.cart
}

export const GET: APIRoute = async ({ url }) => {
  const action = url.searchParams.get("action")
  if (action === "config") {
    const env = medusaEnv()
    return json({ stripeKey: env.stripePk, paypalClientId: env.paypalClientId, store: "TOONHUB" })
  }
  const cartId = url.searchParams.get("cartId")
  if (!cartId) return json({ error: "cartId required" }, 400)
  try {
    const cart = await retrieveCart(cartId)
    let shipping_options: any[] = []
    try {
      const so = await medusaFetch(`/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`)
      shipping_options = so.data?.shipping_options || []
    } catch { /* none */ }
    if (!shipping_options.length) {
      try {
        const so = await (sdk.store as any).fulfillment?.listCartOptions?.({ cart_id: cartId })
        shipping_options = so?.shipping_options || []
      } catch { /* none */ }
    }
    let payment_providers: any[] = []
    try {
      const regionId = cart.region_id || cart.region?.id
      if (regionId) {
        const pp = await medusaFetch(`/store/payment-providers?region_id=${encodeURIComponent(regionId)}`)
        payment_providers = (pp.data?.payment_providers || []).map((p: any) => ({
          id: p.id,
          label: providerLabel(p.id),
        }))
      }
    } catch { /* none */ }
    return json({ cart: mapCart(cart), shipping_options, payment_providers })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { action, cartId } = body
    if (!cartId) return json({ error: "cartId required" }, 400)

    if (action === "update") {
      const name = String(body.name || "").trim()
      const [first_name, ...rest] = name.split(" ")
      const last_name = rest.join(" ") || first_name || "Customer"
      const address = {
        first_name,
        last_name,
        address_1: body.address,
        address_2: body.apartment || "",
        city: body.city,
        postal_code: body.postal,
        country_code: String(body.country || "us").toLowerCase(),
        province: body.province || "",
        phone: body.phone || "",
      }
      const payload: any = {
        email: body.email,
        shipping_address: address,
        billing_address: address,
      }
      if (body.newsletter) payload.metadata = { newsletter: true }
      let cart
      try {
        const out = await sdk.store.cart.update(cartId, payload)
        cart = out.cart
      } catch {
        const { ok, data } = await medusaFetch(`/store/carts/${cartId}`, { method: "POST", body: JSON.stringify(payload) })
        if (!ok) return json({ error: data?.message || "Could not save address" }, 400)
        cart = data.cart
      }
      if (body.newsletter && body.email) {
        await medusaFetch("/store/newsletter-subscribers", { method: "POST", body: JSON.stringify({ email: body.email }) }).catch(() => {})
      }
      return json({ success: true, cart: mapCart(cart) })
    }

    if (action === "shipping") {
      try {
        const { cart } = await sdk.store.cart.addShippingMethod(cartId, { option_id: body.optionId })
        return json({ success: true, cart: mapCart(cart) })
      } catch {
        const { ok, data } = await medusaFetch(`/store/carts/${cartId}/shipping-methods`, {
          method: "POST",
          body: JSON.stringify({ option_id: body.optionId }),
        })
        if (!ok) return json({ error: data?.message || "Could not set shipping" }, 400)
        return json({ success: true, cart: mapCart(data.cart) })
      }
    }

    if (action === "discount") {
      const { ok, data } = await medusaFetch(`/store/carts/${cartId}/promotions`, {
        method: "POST",
        body: JSON.stringify({ promo_codes: [body.code] }),
      })
      if (!ok) return json({ error: data?.message || "Invalid discount code" }, 400)
      return json({ success: true, cart: mapCart(data.cart) })
    }

    if (action === "pay") {
      let cart = await retrieveCart(cartId)
      let session: any = null
      try {
        const out = await sdk.store.payment.initiatePaymentSession(cart, { provider_id: body.providerId })
        cart = out.cart || (await retrieveCart(cartId))
        session = cart.payment_collection?.payment_sessions?.find((s: any) => s.provider_id === body.providerId)
          || cart.payment_collection?.payment_sessions?.[0]
      } catch {
        let collectionId = cart.payment_collection?.id
        if (!collectionId) {
          const created = await medusaFetch("/store/payment-collections", {
            method: "POST",
            body: JSON.stringify({ cart_id: cartId }),
          })
          if (!created.ok) return json({ error: created.data?.message || "Could not start payment" }, 400)
          collectionId = created.data?.payment_collection?.id
        }
        const started = await medusaFetch(`/store/payment-collections/${collectionId}/payment-sessions`, {
          method: "POST",
          body: JSON.stringify({ provider_id: body.providerId }),
        })
        if (!started.ok) return json({ error: started.data?.message || "Could not create payment session" }, 400)
        cart = await retrieveCart(cartId)
        session = cart.payment_collection?.payment_sessions?.find((s: any) => s.provider_id === body.providerId)
          || started.data?.payment_session
          || cart.payment_collection?.payment_sessions?.[0]
      }
      return json({
        success: true,
        cart: mapCart(cart),
        session: {
          id: session?.id,
          provider_id: session?.provider_id || body.providerId,
          data: session?.data || {},
        },
      })
    }

    if (action === "complete") {
      try {
        const out: any = await sdk.store.cart.complete(cartId)
        if (out.type === "order" || out.order) {
          const order = out.order
          return json({ success: true, type: "order", order: { id: order.id, display_id: order.display_id, email: order.email } })
        }
        return json({ error: out.error?.message || "Payment not authorized yet", type: "cart", cart: mapCart(out.cart) }, 400)
      } catch {
        const { ok, data } = await medusaFetch(`/store/carts/${cartId}/complete`, { method: "POST", body: "{}" })
        if (!ok) return json({ error: data?.message || data?.error || "Could not complete order" }, 400)
        if (data.type === "order" || data.order) {
          const order = data.order
          return json({ success: true, type: "order", order: { id: order.id, display_id: order.display_id, email: order.email } })
        }
        return json({ error: data.error?.message || "Payment not authorized yet", type: "cart", cart: mapCart(data.cart) }, 400)
      }
    }

    return json({ error: "Unknown action" }, 400)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
