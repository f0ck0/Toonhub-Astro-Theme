/**
 * Browser-side Medusa transport.
 *
 * Used only as a *resilience* layer: the storefront is server-rendered, and
 * this client is what fills the grid when SSR came back empty (backend down,
 * publishable key missing, CORS blocked) or when the shopper paginates.
 *
 * Requests are tried in order — direct, public CORS relays, then our own
 * `/api/medusa-proxy` — and the first usable JSON wins. Every hop is bounded by
 * an `AbortSignal.timeout` so a dead backend can never hang the page.
 */

import { config } from "./lib/config"

export function cfg(): { baseUrl: string; publishableKey: string } {
  const { baseUrl, publishableKey } = config()
  return { baseUrl, publishableKey }
}

const REQUEST_TIMEOUT = 8000

function endpoints(path: string): string[] {
  const { baseUrl } = cfg()
  const direct = `${baseUrl}${path}`
  return [
    direct,
    `https://corsproxy.org/?${encodeURIComponent(direct)}`,
    `https://corsproxy.io/?${encodeURIComponent(direct)}`,
    `/api/medusa-proxy?path=${encodeURIComponent(path)}`,
  ]
}

function headers(): Record<string, string> {
  const { publishableKey } = cfg()
  const base: Record<string, string> = { accept: "application/json" }
  if (publishableKey) base["x-publishable-api-key"] = publishableKey
  return base
}

/** True when the payload says "reachable, but not allowed" — worth retrying. */
function isSoftFailure(data: unknown): boolean {
  const record = (data || {}) as { type?: string; message?: string; error?: string }
  if (record.type === "not_allowed") return true
  if (/publishable/i.test(String(record.message || ""))) return true
  if (/unreachable|fetch failed|invalid path/i.test(String(record.error || ""))) return true
  return false
}

export async function medusaGet<T = Record<string, unknown>>(path: string): Promise<T> {
  let lastError = "Medusa request failed"

  for (const url of endpoints(path)) {
    try {
      const res = await fetch(url, {
        headers: headers(),
        mode: "cors",
        credentials: "omit",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      })
      const text = await res.text()
      let data: unknown = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        lastError = "non-JSON response"
        continue
      }
      if (isSoftFailure(data)) {
        const record = data as { message?: string; error?: string }
        lastError = String(record.message || record.error || "not allowed")
        continue
      }
      if (res.ok) return data as T
      const record = data as { message?: string; error?: string }
      lastError = String(record.message || record.error || `HTTP ${res.status}`)
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError
    }
  }

  throw new Error(lastError)
}

export interface MedusaSendResult<T = unknown> {
  ok: boolean
  status: number
  data: T
}

export async function medusaSend<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
): Promise<MedusaSendResult<T>> {
  const { baseUrl } = cfg()
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...headers(),
        "content-type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
      mode: "cors",
      credentials: "omit",
      signal: init.signal || AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    const text = await res.text()
    let data: T
    try {
      data = (text ? JSON.parse(text) : {}) as T
    } catch {
      data = { raw: text } as T
    }
    return { ok: res.ok, status: res.status, data }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { error: error instanceof Error ? error.message : "network error" } as T,
    }
  }
}

/** Fields the storefront needs — kept identical to the server-side query. */
export const PRODUCT_FIELDS =
  "+id,+title,+handle,+thumbnail,*variants,*variants.calculated_price,*variants.prices,*images,*categories"

export const CATEGORY_FIELDS = "id,name,handle,parent_category_id,description"
