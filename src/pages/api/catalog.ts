import type { APIRoute } from "astro"
import { getAllCategories, getProducts } from "../../lib/medusa"
import { medusaConfig } from "../../lib/medusa-config"
import { shopCategories } from "../../lib/site"

export const prerender = false

export const GET: APIRoute = async () => {
  const cfg = medusaConfig()
  try {
    const categories = await getAllCategories()
    const shop = shopCategories(categories).map((c: any) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      parent: c.parent_category_id,
      products: c.products?.length || 0,
    }))
    const { count, products } = await getProducts(3, 0, shop[0]?.id)
    return new Response(JSON.stringify({
      ok: true,
      url: cfg.baseUrl,
      hasKey: Boolean(cfg.publishableKey),
      categories: shop,
      sampleCategory: shop[0]?.handle || null,
      sampleCount: count,
      sampleTitles: (products || []).map((p: any) => p.title),
    }), { headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({
      ok: false,
      url: cfg.baseUrl,
      hasKey: Boolean(cfg.publishableKey),
      error: e.message,
    }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
