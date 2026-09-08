/** Shared Medusa HTTP helper for API routes (checkout, reviews, newsletter). */

import { medusaConfig } from "./medusa-config"
import type { MedusaErrorBody } from "../types"

export function medusaEnv() {
  const { baseUrl, publishableKey } = medusaConfig()
  return {
    baseUrl,
    pk: publishableKey,
    stripePk: import.meta.env.PUBLIC_STRIPE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || process.env.PUBLIC_STRIPE_KEY || "",
    paypalClientId: import.meta.env.PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || "",
  }
}

/** `data` is whatever Medusa returned (JSON or a `{ raw }` text envelope). */
export interface MedusaResponse<T = Record<string, unknown>> {
  ok: boolean
  status: number
  data: T & MedusaErrorBody
  res: Response
}

export async function medusaFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
  extraHeaders: Record<string, string> = {},
): Promise<MedusaResponse<T>> {
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
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    signal: init.signal || AbortSignal.timeout(15000),
  })
  const text = await res.text()
  let data: T & MedusaErrorBody
  try {
    data = (text ? JSON.parse(text) : {}) as T & MedusaErrorBody
  } catch {
    data = { raw: text } as T & MedusaErrorBody
  }
  return { ok: res.ok, status: res.status, data, res }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
}

/** `catch (e)` value → displayable message. Lets routes type catches `unknown`. */
export function errorMessage(error: unknown, fallback = "Request failed"): string {
  if (error instanceof Error && error.message) return error.message
  const text = String(error ?? "").trim()
  return text || fallback
}

/** Extract a user-facing message from a Medusa error envelope. */
export function medusaErrorMessage(data: MedusaErrorBody | null | undefined, fallback: string): string {
  if (!data) return fallback
  if (typeof data.error === "string" && data.error) return data.error
  if (data.error && typeof data.error === "object" && data.error.message) return data.error.message
  if (data.message) return data.message
  if (data.errors?.[0]?.message) return data.errors[0].message
  return fallback
}

/** Stripe 子支付方式的品牌名称映射(供前端显示官方标识,增强消费者信任) */
const STRIPE_BRANDS: Record<string, string> = {
  ideal: "iDEAL",
  bancontact: "Bancontact",
  blik: "BLIK",
  giropay: "giropay",
  oxxo: "OXXO",
  promptpay: "PromptPay",
  przelewy24: "P24",
  alipay: "Alipay",
  wechat_pay: "WeChat Pay",
  klarna: "Klarna",
  affrim: "Affirm",
  affirm: "Affirm",
  afterpay: "Afterpay",
  clearpay: "Clearpay",
  sepa_debit: "SEPA Direct Debit",
  sofort: "SOFORT",
  eps: "EPS",
  p24: "P24",
  acss_debit: "ACSS Debit",
  boleto: "Boleto",
  fpx: "FPX",
  grabpay: "GrabPay",
  paynow: "PayNow",
  us_bank_account: "ACH",
  link: "Link",
}

export function providerLabel(id = "") {
  const s = id.toLowerCase()
  if (s.includes("paypal")) return "PayPal"
  if (s.includes("stripe")) {
    // ID 形如 pp_stripe-ideal_stripe / pp_stripe_stripe(卡)
    const m = s.match(/^pp_stripe[-_]([a-z0-9]+)(?:_stripe)?$/)
    const method = m ? m[1] : ""
    if (STRIPE_BRANDS[method]) return STRIPE_BRANDS[method]
    if (!method || method === "stripe" || method === "card") return "Stripe"
    return method.charAt(0).toUpperCase() + method.slice(1)
  }
  if (s.includes("system") || s.includes("manual")) return "Manual payment"
  return id.replace(/^pp_/, "").replace(/_/g, " ")
}
