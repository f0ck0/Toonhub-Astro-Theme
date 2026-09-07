/**
 * Runtime configuration bridge.
 *
 * `Base.astro` renders a `<script type="application/json" id="toonhub-config">`
 * data island. Reading it here keeps the document free of inline JavaScript
 * (CSP-friendly: `script-src` can stay `self` + the module hashes Astro emits)
 * and means there is exactly one place that knows the backend coordinates.
 */

export interface StorefrontConfig {
  baseUrl: string
  publishableKey: string
  locale: string
  currency: string
  quickView: boolean
}

const FALLBACK: StorefrontConfig = {
  baseUrl: "https://medusa.toonhubshop.com",
  publishableKey: "",
  locale: "en",
  currency: "usd",
  quickView: false,
}

let cached: StorefrontConfig | null = null

export function config(): StorefrontConfig {
  if (cached) return cached
  let parsed: Partial<StorefrontConfig> = {}
  try {
    const island = document.getElementById("toonhub-config")
    parsed = island?.textContent ? (JSON.parse(island.textContent) as Partial<StorefrontConfig>) : {}
  } catch {
    parsed = {}
  }
  // Legacy deployments may still expose the old global.
  const legacy = (window as unknown as { toonhubMedusa?: Partial<StorefrontConfig> }).toonhubMedusa

  const baseUrl = String(parsed.baseUrl || legacy?.baseUrl || FALLBACK.baseUrl).replace(/\/$/, "")
  cached = {
    baseUrl,
    publishableKey: String(parsed.publishableKey || legacy?.publishableKey || ""),
    locale: String(parsed.locale || FALLBACK.locale),
    currency: String(parsed.currency || FALLBACK.currency),
    quickView: Boolean(parsed.quickView),
  }
  return cached
}

/** Storage keys — one source of truth so scripts never drift apart. */
export const STORAGE_KEYS = {
  localCart: "toonhub_local_cart",
  cartId: "cartId",
  orders: "toonhub_orders",
  wishlist: "toonhub_wishlist",
  saleEnd: "toonhub_sale_end",
  checkoutDraft: "toonhub_checkout",
  email: "toonhub_email",
} as const

/** localStorage can throw in private mode / sandboxed frames — never crash. */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or blocked storage */
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* blocked storage */
  }
}
