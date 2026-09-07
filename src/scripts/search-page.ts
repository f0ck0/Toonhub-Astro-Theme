/**
 * The `/search` results page.
 *
 * The server renders what it can; this module (a) retries the query from the
 * browser when SSR came back empty — the usual case when the backend was slow
 * at request time — and (b) applies the series / price / sort filters to
 * whichever cards are present. Filters are pure DOM operations on the cards'
 * own `data-*` attributes, so they work identically on SSR and hydrated cards
 * and never need another round trip.
 *
 * With JavaScript disabled the page still shows the server-rendered results;
 * the filter row is hidden in that case (`<noscript>` styles).
 */

import { $, $$, ready } from "./lib/dom"
import { medusaGet, PRODUCT_FIELDS } from "./medusa-client"
import { productCardTemplate } from "./catalog"
import type { Product } from "../types"

const PRICE_BANDS = [
  { min: 0, max: 5000 },
  { min: 5000, max: 10000 },
  { min: 10000, max: 25000 },
  { min: 25000, max: Number.POSITIVE_INFINITY },
]

function root(): HTMLElement | null {
  return $<HTMLElement>("[data-search-page]")
}

function query(): string {
  return root()?.getAttribute("data-search-q") || ""
}

function cards(): HTMLElement[] {
  return $$<HTMLElement>("[data-search-grid] .product-card")
}

function bandValue(value: string): { min: number; max: number } | null {
  if (!value) return null
  const [rawMin, rawMax] = value.split("-")
  const min = Number(rawMin)
  const max = Number(rawMax)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}

function sortCards(list: HTMLElement[], mode: string): HTMLElement[] {
  const title = (card: HTMLElement) => card.getAttribute("data-title") || ""
  const price = (card: HTMLElement) => Number(card.getAttribute("data-price-usd") || 0)
  const copy = [...list]
  switch (mode) {
    case "az":
      return copy.sort((a, b) => title(a).localeCompare(title(b)))
    case "za":
      return copy.sort((a, b) => title(b).localeCompare(title(a)))
    case "price-asc":
      return copy.sort((a, b) => price(a) - price(b))
    case "price-desc":
      return copy.sort((a, b) => price(b) - price(a))
    default:
      return copy
  }
}

/** Hide cards that fail the filters, then re-order the survivors in the DOM. */
export function applyFilters(): void {
  const grid = $<HTMLElement>("[data-search-grid]")
  if (!grid) return

  const series = ($<HTMLSelectElement>("[data-search-series]")?.value || "").trim()
  const band = bandValue($<HTMLSelectElement>("[data-search-price]")?.value || "")
  const sort = $<HTMLSelectElement>("[data-search-sort]")?.value || "featured"
  const all = cards()

  const visible = all.filter((card) => {
    if (series) {
      const cats = (card.getAttribute("data-cats") || "").split(/\s+/)
      if (!cats.includes(series)) return false
    }
    if (band) {
      const price = Number(card.getAttribute("data-price-usd") || 0)
      if (price < band.min || price > band.max) return false
    }
    return true
  })

  all.forEach((card) => {
    card.hidden = !visible.includes(card)
  })
  sortCards(visible, sort).forEach((card) => grid.appendChild(card))

  const count = $<HTMLElement>("[data-search-count]")
  const term = query()
  if (count) {
    count.textContent = `${visible.length} result${visible.length === 1 ? "" : "s"}${
      term ? ` for “${term}”` : ""
    }`
  }

  const empty = $<HTMLElement>("[data-search-empty]")
  if (empty) {
    empty.hidden = visible.length > 0 || !term
  }
}

/** Browser-side retry of the search query when SSR produced no cards. */
async function hydrate(): Promise<void> {
  const grid = $<HTMLElement>("[data-search-grid]")
  const term = query()
  if (!grid || !term || cards().length) return

  grid.dataset.state = "loading"
  try {
    const data = await medusaGet<{ products?: Partial<Product>[] }>(
      `/store/products?q=${encodeURIComponent(term)}&limit=48&fields=${encodeURIComponent(PRODUCT_FIELDS)}`,
    )
    const products = (data.products || []).filter((product) => product && product.handle)
    if (!products.length) {
      grid.dataset.state = "empty"
      return
    }
    grid.dataset.state = "ready"
    grid.innerHTML = products.map((product) => productCardTemplate(product)).join("")
    document.dispatchEvent(new CustomEvent("toonhub:catalog", { detail: { products } }))
  } catch {
    grid.dataset.state = "error"
  } finally {
    applyFilters()
  }
}

function init(): void {
  const page = root()
  if (!page) return

  const filters = $<HTMLElement>("[data-search-filters]")
  if (filters) filters.hidden = !cards().length && !query()

  for (const selector of ["[data-search-series]", "[data-search-price]", "[data-search-sort]"]) {
    $(selector)?.addEventListener("change", applyFilters)
  }

  if (cards().length) applyFilters()
  void hydrate()
}

ready(init)

export { PRICE_BANDS }
