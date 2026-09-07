import type { APIRoute } from "astro"
import { getProducts, productImageUrl, getProductUsdPrice } from "../../lib/medusa"
import { salePrice, formatPriceFrom, currencyFromCookies } from "../../lib/currency"
import { errorMessage } from "../../lib/server-medusa"
import type { Product } from "../../types"

export const prerender = false

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const categoryId = url.searchParams.get("categoryId") || ""
    const offset = parseInt(url.searchParams.get("offset") || "0") || 0
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "24") || 24, 48)
    const { products, count } = await getProducts(limit, offset, categoryId || undefined)
    const currency = currencyFromCookies(cookies)

    const items = (products || []).map((p: Product) => {
      const usd = getProductUsdPrice(p) || 0
      const { sale } = salePrice(usd, currency)
      return {
        handle: p.handle,
        title: p.title,
        thumbnail: productImageUrl(p.thumbnail || ""),
        price: usd ? formatPriceFrom(sale, currency) : "",
        category: p.categories?.[0]?.name || "",
      }
    })

    return new Response(
      JSON.stringify({ products: items, count, hasMore: offset + items.length < count }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: errorMessage(e) }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
