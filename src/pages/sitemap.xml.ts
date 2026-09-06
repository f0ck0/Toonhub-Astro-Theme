import type { APIRoute } from "astro"
import { getNavCategories } from "../lib/medusa"

export const prerender = false

const STATIC = [
  "/",
  "/collections",
  "/collections/new-arrivals",
  "/search",
  "/account",
  "/cart",
  "/track-order",
  "/about",
  "/contact",
  "/care-guide",
  "/affiliate",
  "/blog",
  "/wishlist",
  "/policies/refund-policy",
  "/policies/shipping-policy",
  "/policies/terms-of-service",
  "/policies/privacy-policy",
  "/policies/cancellation-policy",
]

export const GET: APIRoute = async () => {
  const origin = "https://toonhubshop.com"
  const urls = [...STATIC]
  try {
    const cats = await getNavCategories()
    for (const c of cats) {
      if (c.handle) urls.push(`/collections/${c.handle}`)
    }
  } catch { /* static only */ }
  const uniq = [...new Set(urls)]
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniq.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join("\n")}
</urlset>`
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } })
}
