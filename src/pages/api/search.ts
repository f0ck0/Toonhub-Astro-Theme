import type { APIRoute } from "astro"
import { searchProducts, productImageUrl, getProductUsdPrice } from "../../lib/medusa"
import { salePrice, formatPriceFrom, currencyFromCookies } from "../../lib/currency"

export const prerender = false

export const GET: APIRoute = async ({ url, cookies }) => {
  const q = url.searchParams.get("q") || ""
  if (!q.trim()) {
    return new Response(JSON.stringify({ products: [], count: 0 }), { headers: { "Content-Type": "application/json" } })
  }
  try {
    const { products, count } = await searchProducts(q, 24)
    const currency = currencyFromCookies(cookies)
    const items = (products || []).map((p: any) => {
      const usd = getProductUsdPrice(p) || 0
      const { sale } = salePrice(usd, currency)
      return {
        handle: p.handle,
        title: p.title,
        thumbnail: productImageUrl(p.thumbnail),
        price: usd ? formatPriceFrom(sale, currency) : "",
        categories: (p.categories || []).map((c: any) => c.handle || c.name).filter(Boolean),
      }
    })
    return new Response(JSON.stringify({ products: items, count }), { headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ products: [], error: e.message }), { status: 200, headers: { "Content-Type": "application/json" } })
  }
}
