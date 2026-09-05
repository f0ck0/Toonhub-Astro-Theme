import type { APIRoute } from "astro"

const MEDUSA_URL = import.meta.env.MEDUSA_URL || "http://127.0.0.1:9000"
const PK = import.meta.env.MEDUSA_PUBLISHABLE_KEY || ""

// 前端评论代理: 转发到 @lambdacurry/medusa-product-reviews 插件的 store API
export const GET: APIRoute = async ({ url }) => {
  const productId = url.searchParams.get("productId")
  if (!productId) return new Response(JSON.stringify({ reviews: [] }), { headers: { "Content-Type": "application/json" } })
  try {
    const res = await fetch(`${MEDUSA_URL}/store/product-reviews?product_id=${encodeURIComponent(productId)}&limit=50`, {
      headers: { "x-publishable-api-key": PK },
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    const reviews = data?.product_reviews || []
    return new Response(JSON.stringify({ reviews, count: data?.count || reviews.length }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ reviews: [], error: e.message }), { headers: { "Content-Type": "application/json" } })
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { productId, rating, content, name } = body
    if (!productId || !content) {
      return new Response(JSON.stringify({ error: "productId and content are required" }), { status: 400 })
    }
    // 插件 upsert 要求订单上下文; 无订单时返回提示, 由前端引导用户完成购买后再评论
    const res = await fetch(`${MEDUSA_URL}/store/product-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
      body: JSON.stringify({
        reviews: [{ product_id: productId, rating: Math.min(5, Math.max(1, rating || 5)), content, name: name || "Anonymous" }],
      }),
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.message || `Submission failed (${res.status})`
      return new Response(JSON.stringify({ error: msg }), { status: res.status })
    }
    return new Response(JSON.stringify({ success: true, reviews: data?.product_reviews || [] }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
