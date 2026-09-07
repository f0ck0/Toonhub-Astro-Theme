import type { APIRoute } from "astro"
import { getStoreSdk } from "../../lib/medusa-config"
import { medusaFetch, json, medusaEnv, providerLabel, errorMessage, medusaErrorMessage } from "../../lib/server-medusa"
import { resolveCountryCode } from "../../lib/regions"
import type {
  MedusaAddress,
  MedusaCart,
  MedusaCartItem,
  MedusaPaymentCollection,
  MedusaPaymentProvider,
  MedusaPaymentSession,
  MedusaShippingOption,
} from "../../types"

export const prerender = false

const CART_FIELDS = "*items,*items.variant,*items.product,*shipping_address,*billing_address,*shipping_methods,*payment_collection,*payment_collection.payment_sessions,+email,+total,+subtotal,+shipping_total,+discount_total,+tax_total,+currency_code,*region"

/** What `mapCart` emits — the shape the checkout UI consumes. */
export interface CheckoutCart {
  id?: string
  email?: string | null
  currency: string
  total?: number
  subtotal?: number
  shipping_total?: number
  discount_total?: number
  tax_total?: number
  shipping_address?: MedusaAddress | null
  shipping_methods: MedusaCart["shipping_methods"]
  payment_collection?: MedusaPaymentCollection | null
  items: {
    id?: string
    title?: string
    thumbnail?: string | null
    quantity?: number
    unit_price?: number
    variant_title: string
    handle: string
  }[]
}

function mapCart(cart: MedusaCart | null | undefined): CheckoutCart | null {
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
    items: (cart.items || []).map((i: MedusaCartItem) => ({
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

async function retrieveCart(cartId: string): Promise<MedusaCart> {
  const sdk = getStoreSdk()
  try {
    const { cart } = await sdk.store.cart.retrieve(cartId, { fields: CART_FIELDS })
    if (cart) return cart as MedusaCart
  } catch { /* REST fallback */ }
  const { ok, data } = await medusaFetch<{ cart?: MedusaCart }>(`/store/carts/${cartId}?fields=${encodeURIComponent(CART_FIELDS)}`)
  if (!ok) throw new Error(medusaErrorMessage(data, "Cart not found"))
  if (!data.cart) throw new Error("Cart not found")
  return data.cart
}

/** Ignore Medusa placeholder rates (0.1 / 1.0 / 5.0 units) until real options exist. */
function isConfiguredShip(option: MedusaShippingOption): boolean {
  const n = Number(option?.amount ?? option?.calculated_price?.calculated_amount ?? 0)
  if (!n) return true
  if (n > 0 && n < 1) return false
  if (n > 0 && n <= 10) return false
  return true
}

function findSession(cart: MedusaCart | null | undefined, providerId: string): MedusaPaymentSession | undefined {
  const sessions = cart?.payment_collection?.payment_sessions || []
  return sessions.find((s) => s.provider_id === providerId) || sessions[0]
}

interface CheckoutRequestBody {
  action?: string
  cartId?: string
  email?: string
  name?: string
  address?: string
  apartment?: string
  city?: string
  postal?: string
  country?: string
  countryOther?: string
  province?: string
  phone?: string
  newsletter?: boolean
  optionId?: string
  code?: string
  providerId?: string
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
    let shipping_options: MedusaShippingOption[] = []
    try {
      const so = await medusaFetch<{ shipping_options?: MedusaShippingOption[] }>(
        `/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`,
      )
      shipping_options = so.data?.shipping_options || []
    } catch { /* none */ }
    if (!shipping_options.length) {
      try {
        const fulfillment = getStoreSdk().store.fulfillment as unknown as {
          listCartOptions?: (params: { cart_id: string }) => Promise<{ shipping_options?: MedusaShippingOption[] }>
        }
        const so = await fulfillment?.listCartOptions?.({ cart_id: cartId })
        shipping_options = so?.shipping_options || []
      } catch { /* none */ }
    }
    shipping_options = (shipping_options || []).filter(isConfiguredShip)
    let payment_providers: { id: string; label: string }[] = []
    try {
      const regionId = cart.region_id || cart.region?.id
      if (regionId) {
        const pp = await medusaFetch<{ payment_providers?: MedusaPaymentProvider[] }>(
          `/store/payment-providers?region_id=${encodeURIComponent(regionId)}`,
        )
        payment_providers = (pp.data?.payment_providers || [])
          .filter((p): p is MedusaPaymentProvider & { id: string } => Boolean(p?.id))
          .map((p) => ({ id: p.id, label: providerLabel(p.id) }))
      }
    } catch { /* none */ }
    return json({ cart: mapCart(cart), shipping_options, payment_providers })
  } catch (e) {
    return json({ error: errorMessage(e) }, 500)
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CheckoutRequestBody
    const { action, cartId } = body
    if (!cartId) return json({ error: "cartId required" }, 400)

    if (action === "update") {
      const name = String(body.name || "").trim()
      const [first_name, ...rest] = name.split(" ")
      const last_name = rest.join(" ") || first_name || "Customer"
      const otherName = String(body.countryOther || "").trim()
      const country_code = resolveCountryCode(body.country || "", otherName)
      const aptParts = [
        otherName && String(body.country || "").toUpperCase() === "OTHER" ? `Country: ${otherName}` : "",
        body.apartment || "",
      ].filter(Boolean)
      const address: MedusaAddress = {
        first_name,
        last_name,
        address_1: body.address,
        address_2: aptParts.join(" · "),
        city: body.city,
        postal_code: body.postal,
        country_code,
        province: body.province || "",
        phone: body.phone || "",
      }
      const metadata: Record<string, unknown> = {
        ...(body.newsletter ? { newsletter: true } : {}),
        ...(otherName ? { country_other: otherName } : {}),
      }
      const payload = {
        email: body.email,
        shipping_address: address,
        billing_address: address,
        ...(Object.keys(metadata).length ? { metadata } : {}),
      }
      let cart: MedusaCart | undefined
      try {
        const out = await getStoreSdk().store.cart.update(cartId, payload)
        cart = out.cart as MedusaCart
      } catch {
        const { ok, data } = await medusaFetch<{ cart?: MedusaCart }>(`/store/carts/${cartId}`, { method: "POST", body: JSON.stringify(payload) })
        if (!ok) return json({ error: medusaErrorMessage(data, "Could not save address") }, 400)
        cart = data.cart
      }
      if (body.newsletter && body.email) {
        await medusaFetch("/store/newsletter-subscribers", { method: "POST", body: JSON.stringify({ email: body.email }) }).catch(() => {})
      }
      return json({ success: true, cart: mapCart(cart) })
    }

    if (action === "shipping") {
      try {
        const { cart } = await getStoreSdk().store.cart.addShippingMethod(cartId, { option_id: body.optionId || "" })
        return json({ success: true, cart: mapCart(cart as MedusaCart) })
      } catch {
        const { ok, data } = await medusaFetch<{ cart?: MedusaCart }>(`/store/carts/${cartId}/shipping-methods`, {
          method: "POST",
          body: JSON.stringify({ option_id: body.optionId }),
        })
        if (!ok) return json({ error: medusaErrorMessage(data, "Could not set shipping") }, 400)
        return json({ success: true, cart: mapCart(data.cart) })
      }
    }

    if (action === "discount") {
      const { ok, data } = await medusaFetch<{ cart?: MedusaCart }>(`/store/carts/${cartId}/promotions`, {
        method: "POST",
        body: JSON.stringify({ promo_codes: [body.code] }),
      })
      if (!ok) return json({ error: medusaErrorMessage(data, "Invalid discount code") }, 400)
      return json({ success: true, cart: mapCart(data.cart) })
    }

    if (action === "pay") {
      let cart = await retrieveCart(cartId)
      let session: MedusaPaymentSession | undefined
      try {
        const out = await getStoreSdk().store.payment.initiatePaymentSession(cart as never, { provider_id: body.providerId || "" })
        cart = (out.cart as MedusaCart | undefined) || (await retrieveCart(cartId))
        session = findSession(cart, body.providerId || "")
      } catch {
        let collectionId = cart.payment_collection?.id
        if (!collectionId) {
          const created = await medusaFetch<{ payment_collection?: MedusaPaymentCollection }>("/store/payment-collections", {
            method: "POST",
            body: JSON.stringify({ cart_id: cartId }),
          })
          if (!created.ok) return json({ error: medusaErrorMessage(created.data, "Could not start payment") }, 400)
          collectionId = created.data?.payment_collection?.id
        }
        const started = await medusaFetch<{ payment_session?: MedusaPaymentSession }>(
          `/store/payment-collections/${collectionId}/payment-sessions`,
          { method: "POST", body: JSON.stringify({ provider_id: body.providerId }) },
        )
        if (!started.ok) return json({ error: medusaErrorMessage(started.data, "Could not create payment session") }, 400)
        cart = await retrieveCart(cartId)
        session = findSession(cart, body.providerId || "") || started.data?.payment_session
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
      interface CompleteResult {
        type?: string
        order?: { id: string; display_id?: string | number; email?: string }
        cart?: MedusaCart
        error?: { message?: string }
      }
      try {
        const out = (await getStoreSdk().store.cart.complete(cartId)) as CompleteResult
        if (out.type === "order" || out.order) {
          const order = out.order!
          return json({ success: true, type: "order", order: { id: order.id, display_id: order.display_id, email: order.email } })
        }
        return json({ error: out.error?.message || "Payment not authorized yet", type: "cart", cart: mapCart(out.cart) }, 400)
      } catch {
        const { ok, data } = await medusaFetch<CompleteResult>(`/store/carts/${cartId}/complete`, { method: "POST", body: "{}" })
        if (!ok) return json({ error: medusaErrorMessage(data, "Could not complete order") }, 400)
        if (data.type === "order" || data.order) {
          const order = data.order!
          return json({ success: true, type: "order", order: { id: order.id, display_id: order.display_id, email: order.email } })
        }
        const cartErr = typeof data.error === "object" ? data.error?.message : undefined
        return json({ error: cartErr || "Payment not authorized yet", type: "cart", cart: mapCart(data.cart) }, 400)
      }
    }

    return json({ error: "Unknown action" }, 400)
  } catch (e) {
    return json({ error: errorMessage(e) }, 500)
  }
}
