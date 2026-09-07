/**
 * Predictive search for the header overlay.
 *
 * Loaded with `<SearchOverlay />`. Debounced (220 ms) + cancelled in flight, so
 * typing "one piece" costs two requests, not nine. Results render as real
 * anchors — the overlay is a shortcut, `/search` remains the accessible,
 * no-JS route (the form submits there natively).
 */

import { $, $$, escapeHtml, escapePath, ready, setOpen } from "./lib/dom"
import { medusaGet } from "./medusa-client"
import { formatMoney, toMinorUnits } from "./lib/money"

const DEBOUNCE_MS = 220
const MAX_RESULTS = 8

interface SearchHit {
  handle: string
  title: string
  thumbnail?: string
  price?: string
}

let timer = 0
let controller: AbortController | null = null
let lastQuery = ""

function resultsBox(): HTMLElement | null {
  return $<HTMLElement>("[data-search-results]")
}

function hint(message: string): string {
  return `<p class="search-note" role="status">${escapeHtml(message)}</p>`
}

function skeleton(): string {
  return Array.from({ length: 3 })
    .map(
      () => `<div class="search-hit" aria-hidden="true">
        <span class="search-hit__img skeleton-media shimmer"></span>
        <span class="search-hit__body">
          <span class="skeleton-line shimmer" style="width:65%;"></span>
          <span class="skeleton-line shimmer" style="width:30%;"></span>
        </span>
      </div>`,
    )
    .join("")
}

function hitTemplate(hit: SearchHit): string {
  const href = `/products/${escapePath(hit.handle)}`
  const media = hit.thumbnail
    ? `<img class="search-hit__img" src="${escapeHtml(hit.thumbnail)}" alt="" width="64" height="64" loading="lazy" decoding="async" />`
    : `<span class="search-hit__img search-hit__img--placeholder" aria-hidden="true"></span>`
  return `<a class="search-hit" href="${href}">
    ${media}
    <span class="search-hit__body">
      <span class="search-hit__title truncate">${escapeHtml(hit.title)}</span>
      ${hit.price ? `<span class="search-hit__price">${escapeHtml(hit.price)}</span>` : ""}
    </span>
  </a>`
}

function renderHits(query: string, hits: SearchHit[]): void {
  const box = resultsBox()
  if (!box) return
  if (!hits.length) {
    box.innerHTML = `
      <div class="search-empty">
        <p class="search-empty__title">No results for “${escapeHtml(query)}”</p>
        <p class="search-empty__body">Check the spelling, or try a series name like “One Piece”.</p>
        <a class="btn btn-outline" href="/search?q=${encodeURIComponent(query)}">See all results</a>
      </div>`
    return
  }
  box.innerHTML =
    hits.map(hitTemplate).join("") +
    `<a class="search-all" href="/search?q=${encodeURIComponent(query)}">View all results</a>`
}

async function runSearch(query: string): Promise<void> {
  const box = resultsBox()
  if (!box) return
  const trimmed = query.trim()

  controller?.abort()
  if (!trimmed) {
    lastQuery = ""
    box.innerHTML = hint("Type to search figures, series and more.")
    return
  }

  lastQuery = trimmed
  box.innerHTML = skeleton()
  controller = new AbortController()

  try {
    let hits: SearchHit[] = []

    // 1. Our own API — server-side Medusa query with cached results.
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
      const data = (await res.json()) as { products?: Record<string, unknown>[] }
      hits = (data.products || []).slice(0, MAX_RESULTS).map(normalize)
    } catch {
      /* fall through to the browser client */
    }

    // 2. Direct Medusa call — keeps search alive when SSR is unreachable.
    if (!hits.length) {
      try {
        const data = await medusaGet<{ products?: Record<string, unknown>[] }>(
          `/store/products?q=${encodeURIComponent(trimmed)}&limit=${MAX_RESULTS}&fields=+thumbnail,+handle,+title,*variants,*variants.prices,*variants.calculated_price`,
        )
        hits = (data.products || []).slice(0, MAX_RESULTS).map(normalize)
      } catch {
        /* no results */
      }
    }

    // A slower response for an older query must not overwrite the newer one.
    if (trimmed !== lastQuery) return
    renderHits(trimmed, hits)
  } catch {
    if (trimmed === lastQuery) box.innerHTML = hint("Search is unavailable right now.")
  }
}

function normalize(product: Record<string, unknown>): SearchHit {
  const variants = (product.variants as Record<string, unknown>[] | undefined) || []
  const first = variants[0] || {}
  const priceRaw =
    (first.calculated_price as Record<string, unknown> | undefined)?.calculated_amount ??
    ((first.prices as Record<string, unknown>[] | undefined)?.[0]?.amount ?? 0)
  const minor = toMinorUnits(priceRaw)
  const images = (product.images as (Record<string, unknown> | string)[] | undefined) || []
  const firstImage = images[0]
  return {
    handle: String(product.handle || ""),
    title: String(product.title || product.handle || ""),
    thumbnail: String(product.thumbnail || (typeof firstImage === "string" ? firstImage : firstImage?.url) || ""),
    price: minor ? `From ${formatMoney(minor)}` : "",
  }
}

function bind(): void {
  const input = $<HTMLInputElement>("[data-search-input]")
  const box = resultsBox()
  if (!input || !box) return

  input.addEventListener("input", () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void runSearch(input.value), DEBOUNCE_MS)
  })

  // Empty query → submit to the results page instead of doing nothing.
  input.form?.addEventListener("submit", (event) => {
    if (!input.value.trim()) event.preventDefault()
  })

  // Arrow-key navigation through the suggestions.
  input.addEventListener("keydown", (event) => {
    const hits = $$<HTMLAnchorElement>(".search-hit", box)
    if (!hits.length) return
    const active = document.activeElement as HTMLElement | null
    const index = hits.indexOf(active as HTMLAnchorElement)
    if (event.key === "ArrowDown") {
      event.preventDefault()
      hits[index < 0 ? 0 : (index + 1) % hits.length]?.focus()
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      if (index <= 0) input.focus()
      else hits[index - 1]?.focus()
    }
  })

  box.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      const hits = $$<HTMLAnchorElement>(".search-hit", box)
      if (document.activeElement === hits[0]) {
        event.preventDefault()
        input.focus()
      }
    }
  })

  // Close after navigating to a suggestion.
  box.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("a")) setOpen("searchModal", false)
  })
}

ready(bind)
