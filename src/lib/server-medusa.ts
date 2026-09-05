/** Shared Medusa HTTP helper for API routes (checkout, reviews, newsletter). */

import { medusaConfig } from "./medusa-config"

export function medusaEnv() {
  const { baseUrl, publishableKey } = medusaConfig()
  return {
    baseUrl,
    pk: publishableKey,
    stripePk: import.meta.env.PUBLIC_STRIPE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || process.env.PUBLIC_STRIPE_KEY || "",
    paypalClientId: import.meta.env.PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || "",
  }
}

export async function medusaFetch(path: string, init: RequestInit = {}, extraHeaders: Record<string, string> = {}) {
  const { baseUrl, pk } = medusaEnv()
  const headers: Record<string, string> = {
    "x-publishable-api-key": pk,
    accept: "application/json",
    ...extraHeaders,
  }
  if (init.body && !(init.body instanceof FormData) && !headers["content-type"] && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as any) },
    signal: init.signal || AbortSignal.timeout(15000),
  })
  const text = await res.text()
  let data: any = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  return { ok: res.ok, status: res.status, data, res }
}

export function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
}

export function providerLabel(id = "") {
  const s = id.toLowerCase()
  if (s.includes("paypal")) return "PayPal"
  if (s.includes("stripe")) return "Credit card"
  if (s.includes("system") || s.includes("manual")) return "Manual payment"
  return id.replace(/^pp_/, "").replace(/_/g, " ")
}
