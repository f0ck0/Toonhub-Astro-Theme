import type { APIRoute } from "astro"
import { medusaFetch, json } from "../../lib/server-medusa"

export const prerender = false

function reviewImages(r: any): string[] {
  const raw = []
    .concat(r?.images || [])
    .concat(r?.photos || [])
    .concat(r?.image ? [r.image] : [])
    .concat(r?.review_images || [])
  return raw
    .map((x: any) => (typeof x === "string" ? x : x?.url || x?.original_url || x?.src || ""))
    .filter(Boolean)
}

function normalize(r: any) {
  return {
    id: r.id,
    name: r.name || r.first_name || [r.first_name, r.last_name].filter(Boolean).join(" ") || r.customer?.first_name || "Anonymous",
    rating: Number(r.rating) || 5,
    title: r.title || "",
    content: r.content || r.comment || r.body || "",
    created_at: r.created_at,
    response: r.response || r.reply || r.admin_reply || r.product_review_response?.content || "",
    images: reviewImages(r),
  }
}

function extractList(data: any): any[] {
  return data?.product_reviews || data?.reviews || data?.data || (Array.isArray(data) ? data : [])
}

export const GET: APIRoute = async ({ url }) => {
  const productId = url.searchParams.get("productId")
  if (!productId) return json({ reviews: [], count: 0, average: 0 })

  const tries = [
    `/store/product-reviews?product_id=${encodeURIComponent(productId)}&limit=50`,
    `/store/products/${encodeURIComponent(productId)}/reviews?limit=50`,
    `/store/reviews?product_id=${encodeURIComponent(productId)}&limit=50`,
  ]
  let reviews: any[] = []
  for (const path of tries) {
    try {
      const { ok, data } = await medusaFetch(path)
      if (!ok) continue
      const list = extractList(data)
      if (list.length || data?.count === 0) {
        reviews = list.map(normalize)
        break
      }
    } catch { /* next */ }
  }
  const count = reviews.length
  const average = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0
  return json({ reviews, count, average })
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const ct = request.headers.get("content-type") || ""
    let productId = ""
    let rating = 5
    let content = ""
    let name = "Anonymous"
    let title = ""
    let images: string[] = []

    if (ct.includes("multipart/form-data")) {
      const fd = await request.formData()
      productId = String(fd.get("productId") || "")
      rating = Number(fd.get("rating") || 5)
      content = String(fd.get("content") || "")
      name = String(fd.get("name") || "Anonymous")
      title = String(fd.get("title") || "")
      images = fd.getAll("images").filter((v) => typeof v === "string") as string[]
    } else {
      const body = await request.json()
      productId = body.productId || body.product_id
      rating = Number(body.rating || 5)
      content = body.content || body.comment || ""
      name = body.name || body.first_name || "Anonymous"
      title = body.title || ""
      images = body.images || []
    }

    if (!productId || !content) return json({ error: "productId and content are required" }, 400)

    const first = name.split(" ")[0]
    const last = name.split(" ").slice(1).join(" ")
    const payloads: { path: string; body: any }[] = [
      {
        path: "/store/product-reviews",
        body: { reviews: [{ product_id: productId, rating, content, name, title, images }] },
      },
      {
        path: "/store/reviews",
        body: { product_id: productId, rating, content, title, first_name: first, last_name: last, images },
      },
      {
        path: `/store/products/${productId}/reviews`,
        body: { rating, content, title, first_name: first, last_name: last, images, name },
      },
    ]

    let lastErr = "Submission failed"
    for (const p of payloads) {
      const { ok, status, data } = await medusaFetch(p.path, { method: "POST", body: JSON.stringify(p.body) })
      if (ok) return json({ success: true, reviews: extractList(data).map(normalize), data })
      lastErr = data?.message || data?.error || `Submission failed (${status})`
      if (status === 401 || status === 403) lastErr = data?.message || "Please sign in or complete an order before reviewing."
    }
    return json({ error: lastErr }, 400)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
