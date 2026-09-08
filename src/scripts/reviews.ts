/**
 * Review hydration.
 *
 * Medusa's review plugin is optional, so every surface degrades to "no reviews
 * yet" rather than fake social proof. Ratings shown on cards come from the same
 * request that fills the PDP list — one round trip, no invented averages.
 *
 * Work is scheduled on `requestIdleCallback` so it never competes with LCP.
 */

import { $, $$, escapeHtml, ready, whenIdle } from "./lib/dom"
import { medusaGet } from "./medusa-client"
import type { Review, ReviewSummary } from "../types"

const EMPTY: ReviewSummary = { reviews: [], count: 0, average: 0 }

/* -------------------------------------------------------------------------- */
/* Fetching                                                                   */
/* -------------------------------------------------------------------------- */

function extractList(data: unknown): Review[] {
  const record = (data || {}) as Record<string, unknown>
  if (Array.isArray(record.product_reviews)) return record.product_reviews as Review[]
  if (Array.isArray(record.reviews)) return record.reviews as Review[]
  if (Array.isArray(record.data)) return record.data as Review[]
  if (Array.isArray(data)) return data as Review[]
  return []
}

function ratingOf(review: Review | undefined): number {
  const value = Number(review?.rating ?? review?.stars)
  return Number.isFinite(value) && value > 0 ? Math.max(0, Math.min(5, value)) : 0
}

async function fetchReviews(productId?: string): Promise<ReviewSummary> {
  const query = productId
    ? `product_id=${encodeURIComponent(productId)}&limit=50`
    : "limit=100"
  const attempts = productId
    ? [
        `/store/product-reviews?${query}`,
        `/store/products/${encodeURIComponent(productId)}/reviews?limit=50`,
        `/store/reviews?${query}`,
      ]
    : [`/store/product-reviews?${query}`, `/store/reviews?${query}`]

  let lastPayload: unknown = null

  for (const path of attempts) {
    try {
      const data = await medusaGet<Record<string, unknown>>(path)
      lastPayload = data
      const list = extractList(data)
      const count = Number(data?.count ?? data?.total ?? list.length) || 0
      const record = data as { product_reviews?: unknown; reviews?: unknown; average?: number; average_rating?: number }
      if (list.length || count === 0 || record.product_reviews || record.reviews) {
        const rated = list.map(ratingOf).filter((value) => value > 0)
        const average = rated.length
          ? Math.round((rated.reduce((sum, value) => sum + value, 0) / rated.length) * 10) / 10
          : Number(record.average ?? record.average_rating) || 0
        return { reviews: list, count, average }
      }
    } catch {
      /* try the next endpoint shape */
    }
  }

  // Fall back to our own proxy route (works when CORS blocks the browser).
  try {
    const url = productId ? `/api/reviews?productId=${encodeURIComponent(productId)}` : "/api/reviews"
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = (await res.json()) as { reviews?: Review[]; count?: number; average?: number }
    return {
      reviews: data.reviews || extractList(data),
      count: Number(data.count) || 0,
      average: Number(data.average) || 0,
    }
  } catch {
    const list = extractList(lastPayload)
    if (list.length) return { reviews: list, count: list.length, average: 0 }
    return EMPTY
  }
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

function starGlyphs(average: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(average)))
  return "★".repeat(filled) + "☆".repeat(5 - filled)
}

/** Accessible star row: the visual glyphs are hidden, the text is announced. */
function starMarkup(average: number, count: number): string {
  return `<span class="star-glyphs" aria-hidden="true">${starGlyphs(average)}</span>
    <span class="sr-only">Rated ${average.toFixed(1)} out of 5 from ${count} review${count === 1 ? "" : "s"}</span>
    <span class="star-meta" aria-hidden="true">${average.toFixed(1)} / 5.0 (${count})</span>`
}

function fillStarSlot(slot: Element, count: number, average: number): void {
  if (!count || average <= 0) {
    slot.innerHTML = ""
    slot.removeAttribute("aria-label")
    return
  }
  slot.innerHTML = starMarkup(average, count)
}

function reviewPhotos(review: Review): string[] {
  return ([] as unknown[])
    .concat(review.images || [])
    .concat(review.photos || [])
    .concat(review.review_images || [])
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : String((entry as Record<string, unknown>)?.url || (entry as Record<string, unknown>)?.original_url || (entry as Record<string, unknown>)?.src || ""),
    )
    .filter(Boolean)
    .slice(0, 5)
}

function reviewTemplate(review: Review): string {
  const rating = ratingOf(review)
  const name = String(review.name || review.first_name || "Anonymous")
  const title = String(review.title || "")
  const content = String(review.content || review.comment || review.body || "")
  const response = String(review.response || review.reply || "")
  const photos = reviewPhotos(review)
  const date = review.created_at ? new Date(review.created_at) : null

  return `<article class="review" data-review-row>
    <header class="review__head">
      ${rating ? `<p class="review__stars" role="img" aria-label="Rated ${rating} out of 5"><span aria-hidden="true">${starGlyphs(rating)}</span></p>` : ""}
      ${date && !Number.isNaN(date.valueOf())
        ? `<time class="review__date" datetime="${date.toISOString()}">${date.toLocaleDateString()}</time>`
        : ""}
    </header>
    ${title ? `<h3 class="review__title truncate-2">${escapeHtml(title)}</h3>` : ""}
    <p class="review__body">${escapeHtml(content)}</p>
    ${photos.length
      ? `<div class="review-photos">${photos
          .map(
            (src, i) =>
              `<button type="button" class="review-photo" data-review-photo data-index="${i}" aria-label="View customer photo">
                <img src="${escapeHtml(src)}" alt="Customer photo" width="80" height="80" loading="lazy" decoding="async" />
              </button>`,
          )
          .join("")}</div>`
      : ""}
    ${response
      ? `<p class="review__response"><strong>Seller response:</strong> ${escapeHtml(response)}</p>`
      : ""}
    <footer class="review__footer">${escapeHtml(name)}</footer>
  </article>`
}

function skeletonTemplate(count = 2): string {
  return Array.from({ length: count })
    .map(
      () => `<div class="review review--skeleton" aria-hidden="true">
        <span class="skeleton-line shimmer" style="width:35%;"></span>
        <span class="skeleton-line shimmer" style="width:90%;"></span>
        <span class="skeleton-line shimmer" style="width:60%;"></span>
      </div>`,
    )
    .join("")
}

function emptyTemplate(): string {
  return `<div class="empty-state empty-state--compact">
    <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.6-4.6A8.4 8.4 0 0 1 3.6 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"/></svg>
    <p class="empty-state__title">No reviews yet</p>
    <p class="empty-state__body">Be the first to tell collectors what you think.</p>
  </div>`
}

function fillPdpList(summary: ReviewSummary): void {
  const container = $<HTMLElement>("[data-reviews-list]")
  const list = summary.reviews || []

  if (container) {
    container.setAttribute("aria-busy", "false")
    container.innerHTML = list.length
      ? list.map(reviewTemplate).join("")
      : emptyTemplate()
  }

  const countEl = $<HTMLElement>("[data-reviews-count]")
  const averageEl = $<HTMLElement>("[data-reviews-average]")
  const summaryBox = $<HTMLElement>("[data-reviews-summary]")

  if (summaryBox) {
    const hasData = summary.count > 0 && summary.average > 0
    summaryBox.hidden = !hasData
    if (averageEl) {
      averageEl.innerHTML = hasData
        ? starMarkup(summary.average, summary.count)
        : ""
    }
    if (countEl) {
      countEl.textContent = hasData
        ? `${summary.average.toFixed(1)} out of 5 · ${summary.count} review${summary.count === 1 ? "" : "s"}`
        : ""
    }
  }

  const heading = $<HTMLElement>("[data-reviews-heading-count]")
  if (heading) heading.textContent = summary.count ? `(${summary.count})` : ""
}

function fillTrustStrip(count: number, average: number): void {
  const strip = $<HTMLElement>("[data-hydrate-reviews]")
  if (!strip) return
  const fill = $<HTMLElement>("[data-review-fill]", strip)
  const label = $<HTMLElement>("[data-review-count]", strip)
  const hasData = count > 0 && average > 0

  strip.hidden = !hasData
  if (!hasData) return
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, (average / 5) * 100))}%`
  if (label) {
    label.textContent = `${count.toLocaleString()} review${count === 1 ? "" : "s"} · ${average.toFixed(1)}★`
  }
  strip.setAttribute(
    "aria-label",
    `Rated ${average.toFixed(1)} out of 5 from ${count} reviews`,
  )
}

function fillProductCards(reviews: Review[]): void {
  const byProduct: Record<string, { sum: number; n: number }> = {}
  for (const review of reviews) {
    const record = review as Review & { product?: { id?: string } }
    const id = String(review.product_id || record.product?.id || "")
    const rating = ratingOf(review)
    if (!id || !rating) continue
    ;(byProduct[id] ||= { sum: 0, n: 0 })
    byProduct[id].sum += rating
    byProduct[id].n += 1
  }
  for (const slot of $$<HTMLElement>("[data-review-product]")) {
    const id = slot.getAttribute("data-review-product") || ""
    const stats = byProduct[id]
    if (!stats?.n) continue
    fillStarSlot(slot, stats.n, Math.round((stats.sum / stats.n) * 10) / 10)
  }
}

/* -------------------------------------------------------------------------- */
/* Review photo lightbox                                                      */
/* -------------------------------------------------------------------------- */

interface LightboxState {
  photos: string[]
  index: number
}

let lightboxEl: HTMLElement | null = null

/** 点击评论图片打开灯箱:大图 + 星星 + 评论人 + 评论内容 + 多图导航 */
function buildLightbox(article: HTMLElement, startIndex: number): void {
  const photos = Array.from(
    article.querySelectorAll<HTMLImageElement>(".review-photo img"),
  )
    .map((img) => img.getAttribute("src") || "")
    .filter(Boolean)
  if (!photos.length) return
  const state: LightboxState = {
    photos,
    index: Math.max(0, Math.min(startIndex, photos.length - 1)),
  }
  const stars = article.querySelector(".review__stars")?.outerHTML || ""
  const name = article.querySelector(".review__footer")?.textContent?.trim() || ""
  const content = article.querySelector(".review__body")?.textContent?.trim() || ""

  if (!lightboxEl) {
    lightboxEl = document.createElement("div")
    lightboxEl.className = "lb"
    document.body.appendChild(lightboxEl)
  }
  const el = lightboxEl

  const render = () => {
    const i = state.index
    el.innerHTML = `
      <div class="lb-overlay" data-lb-close></div>
      <div class="lb-dialog" role="dialog" aria-modal="true" aria-label="Customer review photo">
        <button type="button" class="lb-close" data-lb-close aria-label="Close">&times;</button>
        ${state.photos.length > 1 ? `<button type="button" class="lb-nav lb-nav--prev" data-lb-prev aria-label="Previous photo">&lsaquo;</button><button type="button" class="lb-nav lb-nav--next" data-lb-next aria-label="Next photo">&rsaquo;</button>` : ""}
        <figure class="lb-figure">
          <img class="lb-img" src="${escapeHtml(state.photos[i])}" alt="Customer photo" />
          <figcaption class="lb-meta">
            ${stars ? `<span class="lb-stars">${stars}</span>` : ""}
            ${name ? `<span class="lb-name">${escapeHtml(name)}</span>` : ""}
            ${content ? `<span class="lb-body">${escapeHtml(content)}</span>` : ""}
          </figcaption>
        </figure>
        ${state.photos.length > 1 ? `<div class="lb-thumbs">${state.photos.map((src, j) => `<button type="button" class="lb-thumb${j === i ? " is-active" : ""}" data-lb-thumb="${j}" aria-label="Photo ${j + 1}"><img src="${escapeHtml(src)}" alt="" width="48" height="48" loading="lazy" decoding="async" /></button>`).join("")}</div>` : ""}
      </div>`
  }

  const close = () => {
    el.hidden = true
    document.body.style.overflow = ""
  }
  const nav = (delta: number) => {
    state.index = (state.index + delta + state.photos.length) % state.photos.length
    render()
  }

  render()
  el.hidden = false
  document.body.style.overflow = "hidden"
  el.onclick = (e) => {
    const target = e.target as HTMLElement
    if (target.closest("[data-lb-close]")) {
      close()
      return
    }
    const thumb = target.closest<HTMLElement>("[data-lb-thumb]")
    if (thumb) {
      state.index = Number(thumb.dataset.lbThumb || 0)
      render()
      return
    }
    if (target.closest("[data-lb-prev]")) {
      nav(-1)
      return
    }
    if (target.closest("[data-lb-next]")) {
      nav(1)
    }
  }
  el.onkeydown = (e) => {
    if (e.key === "Escape") close()
    if (e.key === "ArrowLeft") nav(-1)
    if (e.key === "ArrowRight") nav(1)
  }
  el.tabIndex = -1
  el.focus()
}

/* -------------------------------------------------------------------------- */

async function hydrate(): Promise<void> {
  const productId =
    $<HTMLElement>("[data-pdp-product]")?.getAttribute("data-pdp-product") || ""

  const container = $<HTMLElement>("[data-reviews-list]")
  if (container && !container.querySelector("[data-review-row]")) {
    container.setAttribute("aria-busy", "true")
    container.innerHTML = skeletonTemplate()
  }

  if (productId) {
    try {
      const summary = await fetchReviews(productId)
      fillPdpList(summary)
      for (const slot of $$<HTMLElement>(`[data-review-product="${CSS.escape(productId)}"]`)) {
        fillStarSlot(slot, summary.count, summary.average)
      }
    } catch {
      fillPdpList(EMPTY)
    }
  }

  try {
    const store = await fetchReviews()
    fillTrustStrip(store.count, store.average)
    fillProductCards(store.reviews)
  } catch {
    /* leave the SSR state untouched */
  }
}

declare global {
  interface Window {
    toonhubLoadReviews: typeof hydrate
  }
}

window.toonhubLoadReviews = hydrate

ready(() => {
  if ($("[data-hydrate-reviews]") || $("[data-reviews-list]") || $("[data-review-product]")) {
    whenIdle(() => void hydrate(), 2500)
  }
  // 评论图片点击放大(灯箱)
  document.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-review-photo]")
    if (!btn) return
    const article = btn.closest<HTMLElement>("[data-review-row]")
    if (!article) return
    buildLightbox(article, Number(btn.dataset.index || 0))
  })
})

document.addEventListener("toonhub:catalog", () => whenIdle(() => void hydrate(), 1500))
