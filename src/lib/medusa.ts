import Medusa from "@medusajs/js-sdk"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { formatCurrency, STATIC_RATES, convertAmount } from "./currency"

export const medusa = new Medusa({
  baseUrl: import.meta.env.MEDUSA_URL || "http://localhost:9000",
  publishableKey: import.meta.env.MEDUSA_PUBLISHABLE_KEY || "",
  // SSR 防卡死: 请求必须超时, 避免 Medusa 抖动时页面无限等待
  fetch: (input: any, init?: any) =>
    fetch(input, { ...(init || {}), signal: AbortSignal.timeout(8000) }),
})

/* ---------- 简单 TTL 缓存: 避免每次 SSR 都打 Medusa ---------- */
const cache = new Map<string, { t: number; data: any }>()
const TTL = 60 * 1000 // 60s
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.t < TTL) return hit.data as T
  try {
    const data = await fn()
    cache.set(key, { t: Date.now(), data })
    return data
  } catch (e) {
    // 失败时若有过期缓存则兜底返回, 避免整站白屏
    if (hit) return hit.data as T
    throw e
  }
}

export async function getProducts(limit = 24, offset = 0, categoryId?: string) {
  const key = `products:${limit}:${offset}:${categoryId || "all"}`
  return cached(key, async () => {
    const params: any = { limit, offset, fields: "*variants,*variants.prices,*images,+thumbnail,+description,*categories" }
    if (categoryId) params.category_id = [categoryId]
    const { products, count } = await medusa.store.product.list(params)
    return { products: products || [], count }
  })
}

export async function getProduct(handle: string) {
  return cached(`product:${handle}`, async () => {
    const { products } = await medusa.store.product.list({
      handle,
      fields: "*variants,*variants.prices,*images,+thumbnail,+description,*categories",
    })
    return products?.[0] || null
  })
}

export async function getCategories() {
  return cached("categories:top", async () => {
    const { product_categories } = await medusa.store.category.list({
      fields: "*products",
      parent_category_id: null as any,
    })
    return product_categories || []
  })
}

export async function getAllCategories() {
  return cached("categories:all", async () => {
    const { product_categories } = await medusa.store.category.list({
      fields: "*products",
    })
    return product_categories || []
  })
}

export async function searchProducts(query: string, limit = 24) {
  const key = `search:${query}:${limit}`
  return cached(key, async () => {
    const { products, count } = await medusa.store.product.list({
      limit,
      q: query,
      fields: "*variants,*variants.prices,*images,+thumbnail",
    })
    return { products: products || [], count }
  })
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
