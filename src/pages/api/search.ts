import type { APIRoute } from "astro"
import { searchProducts, productImageUrl, getProductUsdPrice } from "../../lib/medusa"
import { salePrice, formatPriceFrom, currencyFromCookies } from "../../lib/currency"
import { errorMessage } from "../../lib/server-medusa"
import type { Product, ProductCategory } from "../../types"

export const prerender = false

export const GET: APIRoute = async ({ url, cookies }) => {
  const q = url.searchParams.get("q") || ""
  const ok = (payload: unknown) =>
    new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } })
  if (!q.trim()) return ok({ products: [], count: 0 })
  try {
    const { products, count } = await searchProducts(q, 24)
    const currency = currencyFromCookies(cookies)
    const items = (products || []).map((p: Product) => {
      const usd = getProductUsdPrice(p) || 0
      const { sale } = salePrice(usd, currency)
      return {
        handle: p.handle,
        title: p.title,
        thumbnail: productImageUrl(p.thumbnail),
        price: usd ? formatPriceFrom(sale, currency) : "",
        categories: (p.categories || []).map((c: ProductCategory) => c.handle || c.name).filter(Boolean),
      }
    })
    return ok({ products: items, count })
  } catch (e) {
    return ok({ products: [], error: errorMessage(e) })
  }
}
