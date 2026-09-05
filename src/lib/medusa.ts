import Medusa from "@medusajs/js-sdk"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { formatCurrency, STATIC_RATES, convertAmount } from "./currency"
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from "./fallback"

export const medusa = new Medusa({
  baseUrl: import.meta.env.MEDUSA_URL || "http://localhost:9000",
  publishableKey: import.meta.env.MEDUSA_PUBLISHABLE_KEY || "",
  // SSR 防卡死: 请求必须超时, 避免 Medusa 抖动时页面无限等待
  fetch: (input: any, init?: any) =>
    fetch(input, { ...(init || {}), signal: AbortSignal.timeout(2500) }),
})

/* ---------- 简单 TTL 缓存: 避免每次 SSR 都打 Medusa ---------- */
const cache = new Map<string, { t: number; data: any }>()
const TTL = 60 * 1000 // 60s
let medusaDownUntil = 0
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.t < TTL) return hit.data as T
  if (Date.now() < medusaDownUntil) {
    if (hit) return hit.data as T
    throw new Error("medusa unavailable")
  }
  try {
    const data = await fn()
    cache.set(key, { t: Date.now(), data })
    return data
  } catch (e) {
    medusaDownUntil = Date.now() + TTL
    if (hit) return hit.data as T
    throw e
  }
}

function fallbackProducts(categoryId?: string) {
  if (!categoryId) return FALLBACK_PRODUCTS
  const cat = FALLBACK_CATEGORIES.find((c) => c.id === categoryId)
  return (cat?.products as any[]) || FALLBACK_PRODUCTS.filter((p) => p.categories?.[0]?.id === categoryId)
}

export async function getProducts(limit = 24, offset = 0, categoryId?: string) {
  const key = `products:${limit}:${offset}:${categoryId || "all"}`
  try {
    return await cached(key, async () => {
      const params: any = { limit, offset, fields: "*variants,*variants.prices,*images,+thumbnail,+description,*categories" }
      if (categoryId) params.category_id = [categoryId]
      const { products, count } = await medusa.store.product.list(params)
      if (!products?.length) throw new Error("empty catalog")
      return { products, count }
    })
  } catch {
    const all = fallbackProducts(categoryId)
    const data = { products: all.slice(offset, offset + limit), count: all.length }
    cache.set(key, { t: Date.now(), data })
    return data
  }
}

export async function getProduct(handle: string) {
  try {
    return await cached(`product:${handle}`, async () => {
      const { products } = await medusa.store.product.list({
        handle,
        fields: "*variants,*variants.prices,*images,+thumbnail,+description,*categories",
      })
      if (!products?.[0]) throw new Error("missing")
      return products[0]
    })
  } catch {
    return FALLBACK_PRODUCTS.find((p) => p.handle === handle) || null
  }
}

export async function getCategories() {
  try {
    return await cached("categories:top", async () => {
      const { product_categories } = await medusa.store.category.list({
        fields: "*products",
        parent_category_id: null as any,
        limit: 100,
      })
      if (!product_categories?.length) throw new Error("empty")
      return product_categories
    })
  } catch {
    const data = FALLBACK_CATEGORIES.filter((c) => !c.parent_category_id)
    cache.set("categories:top", { t: Date.now(), data })
    return data
  }
}

export async function getNavCategories() {
  try {
    return await cached("categories:nav", async () => {
      const { product_categories } = await medusa.store.category.list({
        fields: "id,name,handle,parent_category_id",
        limit: 200,
      })
      if (!product_categories?.length) throw new Error("empty")
      return product_categories
    })
  } catch {
    cache.set("categories:nav", { t: Date.now(), data: FALLBACK_CATEGORIES })
    return FALLBACK_CATEGORIES
  }
}

export async function getAllCategories() {
  try {
    return await cached("categories:all", async () => {
      const { product_categories } = await medusa.store.category.list({
        fields: "*products",
        limit: 200,
      })
      if (!product_categories?.length) throw new Error("empty")
      return product_categories
    })
  } catch {
    return FALLBACK_CATEGORIES
  }
}

export async function searchProducts(query: string, limit = 24) {
  const key = `search:${query}:${limit}`
  try {
    return await cached(key, async () => {
      const { products, count } = await medusa.store.product.list({
        limit,
        q: query,
        fields: "*variants,*variants.prices,*images,+thumbnail",
      })
      if (!products?.length) throw new Error("empty")
      return { products: products || [], count }
    })
  } catch {
    const q = query.toLowerCase()
    const products = FALLBACK_PRODUCTS.filter((p) => p.title.toLowerCase().includes(q) || p.handle.includes(q))
    return { products: products.slice(0, limit), count: products.length }
  }
}

/**
 * Get the base (USD) price in minor units for a product's first variant.
 */
export function getProductUsdPrice(product: any): number | null {
  const price = product?.variants?.[0]?.prices?.find((p: any) => p.currency_code === "usd")
    ?? product?.variants?.[0]?.prices?.[0]
  return price ? (price.amount ?? null) : null
}

/** Legacy helper: format a product's price in a target currency. */
export function getProductPrice(product: any, currency = "usd"): string {
  const usd = getProductUsdPrice(product)
  if (usd == null) return ""
  return formatCurrency(convertAmount(usd, currency, STATIC_RATES), currency)
}

export function getProductImage(product: any): string {
  return product?.thumbnail || product?.images?.[0]?.url || ""
}

/** Resolve the image URL — images are served by the Astro frontend's static public/ dir. */
const webpExistsCache = new Map<string, boolean>()
export function productImageUrl(path?: string | null): string {
  if (!path) return ""
  if (/^https?:\/\//.test(path)) return path
  const url = path.startsWith("/") ? path : `/${path}`
  // 优先返回已转换的 WebP 版本 (同名 .webp), 减少图片下载体积
  const webp = url.replace(/\.(jpe?g|png)$/i, ".webp")
  if (webp !== url) {
    let has = webpExistsCache.get(webp)
    if (has === undefined) {
      try {
        has = existsSync(join(process.cwd(), "public", webp))
      } catch {
        has = false
      }
      webpExistsCache.set(webp, has)
    }
    if (has) return webp
  }
  return url
}
