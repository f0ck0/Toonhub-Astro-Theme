import { existsSync } from "node:fs"
import { join } from "node:path"
import { formatCurrency, STATIC_RATES, convertAmount } from "./currency"
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from "./fallback"
import { getStoreSdk, medusaConfig } from "./medusa-config"

export { getStoreSdk, medusaConfig }

const PRODUCT_FIELDS = "*variants,*variants.calculated_price,*variants.prices,*images,+thumbnail,+description,*categories"

async function getRegionId(): Promise<string> {
  try {
    return await cached("region:id", async () => {
      const { regions } = await getStoreSdk().store.region.list({ limit: 10 })
      return regions?.[0]?.id || ""
    })
  } catch {
    return ""
  }
}

async function productQuery(extra: Record<string, any> = {}) {
  const regionId = await getRegionId()
  const params: any = { fields: PRODUCT_FIELDS, ...extra }
  if (regionId) params.region_id = regionId
  return params
}

/* ---------- TTL cache ---------- */
const cache = new Map<string, { t: number; data: any }>()
const TTL = 60 * 1000
let medusaDownUntil = 0

function isConnError(e: any) {
  const m = String(e?.message || e || "")
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|aborted|timeout|network/i.test(m)
}

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
    if (isConnError(e)) medusaDownUntil = Date.now() + TTL
    if (hit) return hit.data as T
    throw e
  }
}

function useFallback() {
  return medusaConfig().isLocal
}

function fallbackProducts(categoryId?: string) {
  if (!categoryId) return FALLBACK_PRODUCTS
  const cat = FALLBACK_CATEGORIES.find((c) => c.id === categoryId || c.handle === categoryId)
  return (cat?.products as any[]) || FALLBACK_PRODUCTS.filter((p) => p.categories?.[0]?.id === categoryId)
}

async function expandCategoryIds(categoryId: string): Promise<string[]> {
  try {
    const all = await getNavCategories()
    const ids = [categoryId]
    const walk = (pid: string) => {
      for (const c of all) {
        if (c.parent_category_id === pid) {
          ids.push(c.id)
          walk(c.id)
        }
      }
    }
    walk(categoryId)
    return ids
  } catch {
    return [categoryId]
  }
}

export async function getProducts(limit = 24, offset = 0, categoryId?: string) {
  const key = `products:${limit}:${offset}:${categoryId || "all"}`
  try {
    return await cached(key, async () => {
      const medusa = getStoreSdk()
      const params: any = await productQuery({ limit, offset })
      if (categoryId) params.category_id = await expandCategoryIds(categoryId)
      const { products, count } = await medusa.store.product.list(params)
      if (categoryId && !products?.length) {
        try {
          const { product_category } = await medusa.store.category.retrieve(categoryId, {
            fields: `*products,*products.variants,*products.variants.prices,*products.images,+products.thumbnail`,
          })
          const list = product_category?.products || []
          return { products: list.slice(offset, offset + limit), count: list.length }
        } catch { /* stick with list result */ }
      }
      return { products: products || [], count: count ?? products?.length ?? 0 }
    })
  } catch (e) {
    console.error("getProducts", medusaConfig().baseUrl, e)
    if (!useFallback()) return { products: [], count: 0 }
    const all = fallbackProducts(categoryId)
    return { products: all.slice(offset, offset + limit), count: all.length }
  }
}

export async function getProduct(handle: string) {
  try {
    return await cached(`product:${handle}`, async () => {
      const medusa = getStoreSdk()
      const { products } = await medusa.store.product.list(await productQuery({ handle }))
      if (!products?.[0]) throw new Error("missing")
      return products[0]
    })
  } catch (e) {
    console.error("getProduct", handle, e)
    if (!useFallback()) return null
    return FALLBACK_PRODUCTS.find((p) => p.handle === handle) || null
  }
}

export async function getCategories() {
  try {
    return await cached("categories:top", async () => {
      const medusa = getStoreSdk()
      const { product_categories } = await medusa.store.category.list({
        fields: "id,name,handle,parent_category_id,description",
        parent_category_id: null as any,
        limit: 100,
      })
      return product_categories || []
    })
  } catch (e) {
    console.error("getCategories", e)
    if (!useFallback()) return []
    return FALLBACK_CATEGORIES.filter((c) => !c.parent_category_id)
  }
}

export async function getNavCategories() {
  try {
    return await cached("categories:nav", async () => {
      const medusa = getStoreSdk()
      const { product_categories } = await medusa.store.category.list({
        fields: "id,name,handle,parent_category_id",
        limit: 200,
      })
      if (!product_categories?.length) throw new Error("empty")
      return product_categories
    })
  } catch (e) {
    console.error("getNavCategories", e)
    if (!useFallback()) return []
    return FALLBACK_CATEGORIES
  }
}

export async function getAllCategories() {
  try {
    return await cached("categories:all", async () => {
      const medusa = getStoreSdk()
      let product_categories: any[] = []
      try {
        const r = await medusa.store.category.list({
          fields: "id,name,handle,parent_category_id,description,*category_children,*products,+products.thumbnail,+products.handle,+products.title",
          limit: 200,
        })
        product_categories = r.product_categories || []
      } catch {
        const r = await medusa.store.category.list({
          fields: "id,name,handle,parent_category_id,description,*category_children",
          limit: 200,
        })
        product_categories = r.product_categories || []
      }
      if (!product_categories?.length) throw new Error("empty")
      return product_categories
    })
  } catch (e) {
    console.error("getAllCategories", e)
    if (!useFallback()) return []
    return FALLBACK_CATEGORIES
  }
}

export async function getCategoryByHandle(handle: string) {
  const all = await getAllCategories()
  const hit = all.find((c: any) => c.handle === handle)
  if (hit) return hit
  try {
    const medusa = getStoreSdk()
    const { product_categories } = await medusa.store.category.list({
      handle,
      fields: "id,name,handle,parent_category_id,description,*category_children",
      limit: 1,
    })
    return product_categories?.[0] || null
  } catch {
    return null
  }
}

export async function searchProducts(query: string, limit = 24) {
  const key = `search:${query}:${limit}`
  try {
    return await cached(key, async () => {
      const medusa = getStoreSdk()
      const { products, count } = await medusa.store.product.list(await productQuery({ limit, q: query }))
      return { products: products || [], count: count ?? products?.length ?? 0 }
    })
  } catch (e) {
    console.error("searchProducts", e)
    if (!useFallback()) return { products: [], count: 0 }
    const q = query.toLowerCase()
    const products = FALLBACK_PRODUCTS.filter((p) => p.title.toLowerCase().includes(q) || p.handle.includes(q))
    return { products: products.slice(0, limit), count: products.length }
  }
}

export function getProductUsdPrice(product: any): number | null {
  const price = product?.variants?.[0]?.prices?.find((p: any) => p.currency_code === "usd")
    ?? product?.variants?.[0]?.calculated_price?.calculated_amount
    ?? product?.variants?.[0]?.prices?.[0]
  if (price == null) return null
  if (typeof price === "number") return Math.round(price * (price < 1000 ? 100 : 1))
  return price.amount ?? null
}

export function getProductPrice(product: any, currency = "usd"): string {
  const usd = getProductUsdPrice(product)
  if (usd == null) return ""
  return formatCurrency(convertAmount(usd, currency, STATIC_RATES), currency)
}

export function getProductImage(product: any): string {
  return product?.thumbnail || product?.images?.[0]?.url || ""
}

const webpExistsCache = new Map<string, boolean>()
export function productImageUrl(path?: string | null): string {
  if (!path) return ""
  if (/^https?:\/\//.test(path)) return path
  const url = path.startsWith("/") ? path : `/${path}`
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
