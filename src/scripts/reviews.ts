import { medusaGet } from "./medusa-client"

function extractList(data: any): any[] {
  if (!data) return []
  if (Array.isArray(data.product_reviews)) return data.product_reviews
  if (Array.isArray(data.reviews)) return data.reviews
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data)) return data
  return []
}

function ratingOf(r: any): number {
  const n = Number(r?.rating ?? r?.stars)
  return Number.isFinite(n) && n > 0 ? Math.max(0, Math.min(5, n)) : 0
}

function glyphs(avg: number) {
  const n = Math.max(0, Math.min(5, Math.round(avg)))
  return "★".repeat(n) + "☆".repeat(5 - n)
}

function esc(s: string) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

type ReviewPayload = { reviews: any[]; count: number; average: number }

async function fetchReviews(productId?: string): Promise<ReviewPayload> {
  const empty: ReviewPayload = { reviews: [], count: 0, average: 0 }
  const q = productId
    ? `product_id=${encodeURIComponent(productId)}&limit=50`
    : "limit=100"
  const tries = productId
    ? [
        `/store/product-reviews?${q}`,
        `/store/products/${encodeURIComponent(productId)}/reviews?limit=50`,
        `/store/reviews?${q}`,
      ]
    : [
        `/store/product-reviews?${q}`,
        `/store/reviews?${q}`,
      ]

  let last: any = null
  for (const path of tries) {
    try {
      const data = await medusaGet(path)
      last = data
      const list = extractList(data)
      const count = Number(data?.count ?? data?.total ?? list.length) || 0
      if (list.length || count === 0 || data?.product_reviews || data?.reviews) {
        const rated = list.map(ratingOf).filter((n) => n > 0)
        const average = rated.length
          ? Math.round((rated.reduce((s, n) => s + n, 0) / rated.length) * 10) / 10
          : Number(data?.average ?? data?.average_rating) || 0
        return { reviews: list, count, average }
      }
    } catch {
      /* next */
    }
  }

  try {
    const url = productId ? `/api/reviews?productId=${encodeURIComponent(productId)}` : "/api/reviews"
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    return {
      reviews: data.reviews || extractList(data),
      count: Number(data.count) || 0,
      average: Number(data.average) || 0,
    }
  } catch {
    if (last) {
      const list = extractList(last)
      return { reviews: list, count: list.length, average: 0 }
    }
    return empty
  }
}

function fillTrust(count: number, average: number) {
  const strip = document.querySelector("[data-hydrate-reviews]")
  if (!strip) return
  const fill = strip.querySelector<HTMLElement>("[data-review-fill]")
  const countEl = strip.querySelector("[data-review-count]")
  const pct = average > 0 ? Math.max(0, Math.min(100, (average / 5) * 100)) : 0
  if (fill) fill.style.width = `${pct}%`
  if (countEl) countEl.textContent = `${count.toLocaleString()} review${count === 1 ? "" : "s"}`
}

function fillStarSlot(el: Element, count: number, average: number) {
  if (!count || average <= 0) {
    el.innerHTML = ""
    return
  }
  el.innerHTML = `<span class="star-glyphs">${glyphs(average)}</span><span class="star-meta">${average.toFixed(1)} / 5.0 (${count})</span>`
}

function fillProductCards(reviews: any[]) {
  const byId: Record<string, { sum: number; n: number }> = {}
  for (const r of reviews) {
    const id = r.product_id || r.product?.id || r.product_id_id
    const rating = ratingOf(r)
    if (!id || !rating) continue
    if (!byId[id]) byId[id] = { sum: 0, n: 0 }
    byId[id].sum += rating
    byId[id].n += 1
  }
  document.querySelectorAll("[data-review-product]").forEach((el) => {
    const id = el.getAttribute("data-review-product") || ""
    const s = byId[id]
    if (!s?.n) return
    fillStarSlot(el, s.n, Math.round((s.sum / s.n) * 10) / 10)
  })
}

function fillPdpList(payload: ReviewPayload) {
  const container = document.getElementById("reviewsContainer")
  const summary = document.getElementById("reviewSummary")
  if (summary) {
    if (payload.count && payload.average > 0) {
      summary.hidden = false
      const stars = document.getElementById("reviewAvgStars")
      const text = document.getElementById("reviewAvgText")
      if (stars) stars.textContent = glyphs(payload.average)
      if (text) text.textContent = `${payload.average} out of 5 · ${payload.count} review${payload.count === 1 ? "" : "s"}`
    } else {
      summary.hidden = true
    }
  }
  if (!container) return
  const list = payload.reviews || []
  if (!list.length) {
    container.innerHTML = '<div style="color:#888;font-size:0.85rem;">No reviews yet.</div>'
    return
  }
  container.innerHTML = list.map((r: any) => {
    const n = ratingOf(r)
    const star = n ? glyphs(n) : ""
    const photos = []
      .concat(r.images || [])
      .concat(r.photos || [])
      .concat(r.review_images || [])
      .map((x: any) => (typeof x === "string" ? x : x?.url || x?.original_url || x?.src || ""))
      .filter(Boolean)
      .map((src: string) => `<img src="${esc(src)}" alt="">`)
      .join("")
    const name = r.name || r.first_name || r.customer?.first_name || "Anonymous"
    const title = r.title || ""
    const content = r.content || r.comment || r.body || ""
    const response = r.response || r.reply || r.admin_reply || r.product_review_response?.content || ""
    return `<div style="border-bottom:1px solid var(--color-border);padding:16px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="color:var(--color-star);font-size:0.9rem;">${star}</div>
        <span style="font-size:0.75rem;color:#888;">${esc(name)}${r.created_at ? " · " + new Date(r.created_at).toLocaleDateString() : ""}</span>
      </div>
      ${title ? `<h4 style="font-size:0.95rem;color:#fff;margin-bottom:6px;">${esc(title)}</h4>` : ""}
      <p style="font-size:0.85rem;color:#ddd;line-height:1.6;">${esc(content)}</p>
      ${photos ? `<div class="review-photos">${photos}</div>` : ""}
      ${response ? `<div style="margin-top:10px;padding:10px 14px;background:#1a1a1a;border-radius:0.3rem;font-size:0.82rem;color:#bbb;"><strong style="color:#fff;">Seller response:</strong> ${esc(response)}</div>` : ""}
    </div>`
  }).join("")
}

async function hydrate() {
  const pdpId = document.querySelector("[data-pdp-product]")?.getAttribute("data-pdp-product") || ""
  try {
    if (pdpId) {
      const payload = await fetchReviews(pdpId)
      fillPdpList(payload)
      document.querySelectorAll(`[data-review-product="${CSS.escape(pdpId)}"]`).forEach((el) => {
        fillStarSlot(el, payload.count, payload.average)
      })
    }
  } catch (e) {
    console.warn("[toonhub reviews]", e)
    const container = document.getElementById("reviewsContainer")
    if (container && !container.querySelector("[data-review-row]")) {
      container.innerHTML = '<div style="color:#888;font-size:0.85rem;">No reviews yet.</div>'
    }
  }

  try {
    const store = await fetchReviews()
    fillTrust(store.count, store.average)
    fillProductCards(store.reviews)
  } catch (e) {
    console.warn("[toonhub reviews]", e)
  }
}

;(window as any).toonhubLoadReviews = hydrate

function startReviews() {
  const run = () => hydrate()
  const ric = (window as any).requestIdleCallback
  if (typeof ric === "function") ric(run, { timeout: 2500 })
  else setTimeout(run, 400)
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startReviews)
else startReviews()
document.addEventListener("toonhub:catalog", hydrate)
