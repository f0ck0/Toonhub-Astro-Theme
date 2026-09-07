/**
 * Server-side Medusa catalogue access.
 *
 * Design rules:
 * - **Never throw at a page.** Every exported getter resolves to a usable value
 *   (`[]`, `null`, `{ products: [], count: 0 }`) so a backend outage degrades
 *   the UI instead of returning a 500.
 * - **Stale-while-error.** A 60 s TTL cache keeps serving the last good payload
 *   when the backend starts failing mid-session.
 * - **Circuit breaker.** After a connection-level failure we stop hammering the
 *   backend for one TTL window (`medusaDownUntil`).
 * - **Demo catalogue.** While the breaker is open — or on a localhost backend —
 *   `src/lib/fallback.ts` supplies the series tiles so the storefront still
 *   renders. Set `DEMO_CATALOG=off` to disable that behaviour.
 */

import { existsSync } from "node:fs"
import { join } from "node:path"
import { formatCurrency, STATIC_RATES, convertAmount } from "./currency"
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from "./fallback"
import { getStoreSdk, medusaConfig } from "./medusa-config"
import { productImage } from "./images"
import type { PagedProducts, Product, ProductCategory } from "../types"

export { getStoreSdk, medusaConfig }
export { isFallbackProduct } from "./fallback"

const PRODUCT_FIELDS =
  "+id,+title,+handle,+thumbnail,+description,*variants,*variants.calculated_price,*variants.prices,*images,*categories"

const CATEGORY_FIELDS = "id,name,handle,parent_category_id,description"

/* -------------------------------------------------------------------------- */
/* Cache + circuit breaker                                                    */
/* -------------------------------------------------------------------------- */

interface CacheEntry<T> {
  t: number
  data: T
}

const cache = new Map<string, CacheEntry<unknown>>()
const TTL = 60 * 1000
let medusaDownUntil = 0

function isConnError(error: unknown): boolean {
  const message = String((error as Error)?.message || error || "")
  return /ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|aborted|timeout|network|socket/i.test(
    message,
  )
}

function backendDown(): boolean {
  return Date.now() < medusaDownUntil
}

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined
  if (hit && Date.now() - hit.t < TTL) return hit.data
  if (backendDown()) {
    if (hit) return hit.data
    throw new Error("medusa unavailable")
  }
  try {
    const data = await fn()
    cache.set(key, { t: Date.now(), data })
    return data
  } catch (error) {
    if (isConnError(error)) medusaDownUntil = Date.now() + TTL
    if (hit) return hit.data
    throw error
  }
}

/** Log once per unique failure so a dead backend does not flood the console. */
const logged = new Set<string>()
function warnOnce(key: string, error: unknown): void {
  if (logged.has(key)) return
  logged.add(key)
  console.warn(`[medusa] ${key}:`, error instanceof Error ? error.message : error)
}

const demoCatalogEnabled = String(
  import.meta.env.DEMO_CATALOG ?? process.env.DEMO_CATALOG ?? "on",
).toLowerCase() !== "off"

/** Serve the demo catalogue when the real one is provably unavailable. */
function useFallback(): boolean {
  if (!demoCatalogEnabled) return false
  return medusaConfig().isLocal || backendDown()
}

function fallbackProducts(categoryId?: string): Product[] {
  if (!categoryId) return FALLBACK_PRODUCTS
  const category = FALLBACK_CATEGORIES.find((c) => c.id === categoryId || c.handle === categoryId)
  const owned = (category?.products || []) as Product[]
  if (owned.length) return owned
  return FALLBACK_PRODUCTS.filter((product) =>
    (product.categories || []).some((c) => c.id === categoryId || c.handle === categoryId),
  )
}

async function getRegionId(): Promise<string> {
  try {
    return await cached<string>("region:id", async () => {
      const { regions } = await getStoreSdk().store.region.list({ limit: 10 })
      return regions?.[0]?.id || ""
    })
  } catch {
    return ""
  }
}

interface ProductQueryParams extends Record<string, unknown> {
  fields: string
  limit?: number
  offset?: number
}

async function productQuery(extra: Record<string, unknown> = {}): Promise<ProductQueryParams> {
  const regionId = await getRegionId()
  const params: ProductQueryParams = { fields: PRODUCT_FIELDS, ...extra }
  if (regionId) params.region_id = regionId
  return params
}

/** Expand a category to itself + every descendant (Medusa needs all ids). */
async function expandCategoryIds(categoryId: string): Promise<string[]> {
  try {
    const all = await getNavCategories()
    const ids = [categoryId]
    const walk = (parentId: string) => {
      for (const category of all) {
        if (category.parent_category_id === parentId) {
          ids.push(category.id)
          walk(category.id)
        }
      }
    }
    walk(categoryId)
    return ids
  } catch {
    return [categoryId]
  }
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export async function getProductsByIds(ids: (string | undefined | null)[]): Promise<PagedProducts> {
  const unique = [...new Set((ids || []).map((id) => String(id || "")).filter(Boolean))]
  if (!unique.length) return { products: [], count: 0 }
  try {
    const medusa = getStoreSdk()
    const out: Product[] = []
    for (let i = 0; i < unique.length; i += 50) {
      const chunk = unique.slice(i, i + 50)
      const params = await productQuery({ limit: chunk.length, id: chunk })
      const { products } = await medusa.store.product.list(params)
      out.push(...((products || []) as Product[]))
    }
    return { products: out, count: out.length }
  } catch (error) {
    warnOnce("getProductsByIds", error)
    if (!useFallback()) return { products: [], count: 0 }
    const wanted = new Set(unique)
    const list = FALLBACK_PRODUCTS.filter((product) => wanted.has(product.id))
    return { products: list.length ? list : FALLBACK_PRODUCTS.slice(0, unique.length), count: list.length }
  }
}

export async function getProducts(
  limit = 24,
  offset = 0,
  categoryId?: string,
): Promise<PagedProducts> {
  const key = `products:${limit}:${offset}:${categoryId || "all"}`
  try {
    return await cached<PagedProducts>(key, async () => {
      const medusa = getStoreSdk()
      const params = await productQuery({ limit, offset })
      if (categoryId) params.category_id = await expandCategoryIds(categoryId)
      const { products, count } = await medusa.store.product.list(params)
      const list = (products || []) as Product[]

      // Some Medusa builds ignore `category_id[]`; fall back to the category's
      // own product list rather than showing an empty collection.
      if (categoryId && !list.length) {
        try {
          const { product_category } = await medusa.store.category.retrieve(categoryId, {
            fields:
              "*products,*products.variants,*products.variants.prices,*products.images,+products.thumbnail",
          })
          const owned = (product_category?.products || []) as Product[]
          return { products: owned.slice(offset, offset + limit), count: owned.length }
        } catch {
          /* keep the (empty) list result */
        }
      }
      return { products: list, count: count ?? list.length }
    })
  } catch (error) {
    warnOnce(`getProducts:${key}`, error)
    if (!useFallback()) return { products: [], count: 0 }
    const all = fallbackProducts(categoryId)
    return { products: all.slice(offset, offset + limit), count: all.length }
  }
}

export async function getProduct(handle: string): Promise<Product | null> {
  const clean = String(handle || "").trim()
  if (!clean) return null
  try {
    return await cached<Product>(`product:${clean}`, async () => {
      const medusa = getStoreSdk()
      const { products } = await medusa.store.product.list(await productQuery({ handle: clean }))
      const found = (products || [])[0] as Product | undefined
      if (!found) throw new Error("missing")
      return found
    })
  } catch (error) {
    warnOnce(`getProduct:${clean}`, error)
    if (!useFallback()) return null
    return FALLBACK_PRODUCTS.find((product) => product.handle === clean) || null
  }
}

export async function searchProducts(query: string, limit = 24): Promise<PagedProducts> {
  const term = String(query || "").trim()
  if (!term) return { products: [], count: 0 }
  const key = `search:${term}:${limit}`
  try {
    return await cached<PagedProducts>(key, async () => {
      const medusa = getStoreSdk()
      const { products, count } = await medusa.store.product.list(await productQuery({ limit, q: term }))
      const list = (products || []) as Product[]
      return { products: list, count: count ?? list.length }
    })
  } catch (error) {
    warnOnce(`searchProducts:${key}`, error)
    if (!useFallback()) return { products: [], count: 0 }
    const needle = term.toLowerCase()
    const matches = FALLBACK_PRODUCTS.filter(
      (product) =>
        product.title.toLowerCase().includes(needle) ||
        String(product.handle).toLowerCase().includes(needle) ||
        (product.categories || []).some((category) =>
          String(category.name).toLowerCase().includes(needle),
        ),
    )
    return { products: matches.slice(0, limit), count: matches.length }
  }
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export async function getCategories(): Promise<ProductCategory[]> {
  try {
    return await cached<ProductCategory[]>("categories:top", async () => {
      const medusa = getStoreSdk()
      const { product_categories } = await medusa.store.category.list({
        fields: CATEGORY_FIELDS,
        parent_category_id: null as unknown as string,
        limit: 100,
      })
      return (product_categories || []) as ProductCategory[]
    })
  } catch (error) {
    warnOnce("getCategories", error)
    if (!useFallback()) return []
    return FALLBACK_CATEGORIES.filter((category) => !category.parent_category_id)
  }
}

export async function getNavCategories(): Promise<ProductCategory[]> {
  try {
    return await cached<ProductCategory[]>("categories:nav", async () => {
      const medusa = getStoreSdk()
      const { product_categories } = await medusa.store.category.list({
        fields: "id,name,handle,parent_category_id",
        limit: 200,
      })
      const list = (product_categories || []) as ProductCategory[]
      if (!list.length) throw new Error("empty")
      return list
    })
  } catch (error) {
    warnOnce("getNavCategories", error)
    if (!useFallback()) return []
    return FALLBACK_CATEGORIES
  }
}

export async function getAllCategories(): Promise<ProductCategory[]> {
  try {
    return await cached<ProductCategory[]>("categories:all", async () => {
      const medusa = getStoreSdk()
      let list: ProductCategory[] = []
      try {
        const response = await medusa.store.category.list({
          fields: `${CATEGORY_FIELDS},*category_children,*products,+products.thumbnail,+products.handle,+products.title`,
          limit: 200,
        })
        list = (response.product_categories || []) as ProductCategory[]
      } catch {
        const response = await medusa.store.category.list({
          fields: `${CATEGORY_FIELDS},*category_children`,
          limit: 200,
        })
        list = (response.product_categories || []) as ProductCategory[]
      }
      if (!list.length) throw new Error("empty")
      return list
    })
  } catch (error) {
    warnOnce("getAllCategories", error)
    if (!useFallback()) return []
    return FALLBACK_CATEGORIES
  }
}

export async function getCategoryByHandle(handle: string): Promise<ProductCategory | null> {
  const clean = String(handle || "").trim()
  if (!clean) return null
  const all = await getAllCategories()
  const hit = all.find((category) => category.handle === clean)
  if (hit) return hit
  try {
    const medusa = getStoreSdk()
    const { product_categories } = await medusa.store.category.list({
      handle: clean,
      fields: `${CATEGORY_FIELDS},*category_children`,
      limit: 1,
    })
    return ((product_categories || [])[0] as ProductCategory) || null
  } catch (error) {
    warnOnce(`getCategoryByHandle:${clean}`, error)
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Price / image helpers                                                      */
/* -------------------------------------------------------------------------- */

/**
 * USD price of the first variant, in **minor units**.
 * Handles Medusa's calculated price, raw price lists and the occasional
 * deployment that stores major units. Returns `null` when unknown — callers
 * must hide the price rather than render $0.00.
 */
export function getProductUsdPrice(product: Product | null | undefined): number | null {
  const variant = product?.variants?.[0]
  if (!variant) return null
  const usdPrice = (variant.prices || []).find(
    (price) => String(price.currency_code || "").toLowerCase() === "usd",
  )
  const candidates: unknown[] = [
    variant.calculated_price?.calculated_amount,
    variant.calculated_price?.original_amount,
    usdPrice?.amount,
    variant.prices?.[0]?.amount,
  ]
  for (const raw of candidates) {
    if (raw == null) continue
    const value = Number(typeof raw === "object" ? (raw as { amount?: number }).amount : raw)
    if (!Number.isFinite(value) || value <= 0) continue
    return value > 0 && value < 1000 ? Math.round(value * 100) : Math.round(value)
  }
  return null
}

export function getProductPrice(product: Product | null | undefined, currency = "usd"): string {
  const usd = getProductUsdPrice(product)
  if (usd == null) return ""
  return formatCurrency(convertAmount(usd, currency, STATIC_RATES), currency)
}

/** @deprecated use `productImage()` from `lib/images` — kept for API routes. */
export function getProductImage(product: Product | null | undefined): string {
  return productImage(product)
}

const webpExistsCache = new Map<string, boolean>()

/**
 * Prefer the local WebP twin of a catalogue image when the theme mirrors it in
 * `public/images/**` (smaller payload than the original JPEG/PNG upload).
 */
export function productImageUrl(path?: string | null): string {
  if (!path) return ""
  if (/^https?:\/\//.test(path)) return path
  const url = path.startsWith("/") ? path : `/${path}`
  const webp = url.replace(/\.(jpe?g|png)$/i, ".webp")
  if (webp === url) return url

  let exists = webpExistsCache.get(webp)
  if (exists === undefined) {
    try {
      exists = existsSync(join(process.cwd(), "public", webp))
    } catch {
      exists = false
    }
    webpExistsCache.set(webp, exists)
  }
  return exists ? webp : url
}

/** `true` while the circuit breaker is open — pages can show a dev notice. */
export function isCatalogDegraded(): boolean {
  return backendDown()
}
