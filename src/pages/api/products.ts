import type { APIRoute } from "astro"
import Medusa from "@medusajs/js-sdk"

export const prerender = false

const medusa = new Medusa({
  baseUrl: process.env.MEDUSA_URL || "http://localhost:9000",
  publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || "",
})

function fmtPrice(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const categoryId = url.searchParams.get("categoryId") || ""
    const offset = parseInt(url.searchParams.get("offset") || "0") || 0
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "24") || 24, 48)

    const params: any = {
      limit,
      offset,
      fields: "handle,title,thumbnail,*variants.prices,*categories.name",
    }
    if (categoryId) params.category_id = [categoryId]

    const { products, count } = await medusa.store.product.list(params)

    const items = (products || []).map((p: any) => ({
      handle: p.handle,
      title: p.title,
      thumbnail: p.thumbnail || "",
      price: p.variants?.[0]?.prices?.[0] ? fmtPrice(p.variants[0].prices[0].amount) : "",
      category: p.categories?.[0]?.name || "",
    }))

    return new Response(
      JSON.stringify({ products: items, count, hasMore: offset + items.length < count }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}