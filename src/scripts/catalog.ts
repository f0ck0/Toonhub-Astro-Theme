/**
 * Catalogue resilience + infinite scroll.
 *
 * Two jobs, both optional at runtime:
 *
 * 1. **Hydration fallback.** The grid is server-rendered. If SSR came back
 *    empty (Medusa unreachable from the server, publishable key missing,
 *    category mismatch) this module retries from the browser — through the
 *    public CORS relays and finally `/api/medusa-proxy` — and paints real cards
 *    over the skeleton the server already rendered.
 * 2. **Infinite scroll** on collection pages, with a visible "Load more" button
 *    as the no-JS-observer fallback and an `aria-live` status line.
 *
 * Cards injected here mirror `ProductCard.astro` markup exactly, so quick view,
 * wishlist sync and review hydration all keep working.
 */

import { $, $$, escapeHtml, escapePath, ready, whenIdle } from "./lib/dom"
import { CATEGORY_FIELDS, medusaGet, PRODUCT_FIELDS } from "./medusa-client"
import { formatMoney, toMinorUnits } from "./lib/money"
import type { Product, ProductCategory, QuickViewData } from "../types"

const PAGE_SIZE = 24

/* -------------------------------------------------------------------------- */
/* Catalogue helpers (mirrors src/lib/site.ts for the browser)                */
/* -------------------------------------------------------------------------- */

function shopCategories(categories: ProductCategory[]): ProductCategory[] {
  const list = Array.isArray(categories) ? categories : []
  const parents = list.filter((c) => !c.parent_category_id)
  const childMap: Record<string, ProductCategory[]> = {}
  for (const category of list) {
    const parent = category.parent_category_id
    if (parent) (childMap[parent] ||= []).push(category)
  }
  const figures = list.find(
    (c) => /^figures?(-\d+)?$/i.test(String(c.handle || "")) || /^figures?$/i.test(String(c.name || "")),
  )
  let picked: ProductCategory[] = []
  if (figures && childMap[figures.id]?.length) picked = childMap[figures.id]
  else {
    const leaves = list.filter((c) => c.parent_category_id)
    picked = leaves.length ? leaves : parents.length ? parents : list
  }
  return picked.sort((a, b) =>
    String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }),
  )
}

/** First product bucketed under `key`, tolerating an absent id/handle. */
function firstIn(byCategory: Record<string, Product[]>, key?: string | null): Product | undefined {
  return key ? byCategory[key]?.[0] : undefined
}

function imageOf(product: Partial<Product> | undefined): string {
  if (!product) return ""
  const thumb = String(product.thumbnail || "").trim()
  if (thumb) return thumb
  const first = (product.images || [])
    .map((entry) => (typeof entry === "string" ? entry : entry?.url || ""))
    .find((url) => Boolean(url))
  return first || ""
}

function hoverImageOf(product: Partial<Product> | undefined): string {
  const primary = imageOf(product)
  return (
    (product?.images || [])
      .map((entry) => (typeof entry === "string" ? entry : entry?.url || ""))
      .find((url) => url && url !== primary) || ""
  )
}

/** Local `public/` artwork goes through the resizer; remote URLs pass through. */
function cardSrc(src: string, width = 400): string {
  if (!src) return ""
  if (!src.startsWith("/")) return src
  return `/img/w${width}${src.startsWith("/") ? src : `/${src}`}`
}

function priceOf(product: Partial<Product>): number {
  const variant = product?.variants?.[0]
  const raw =
    variant?.calculated_price?.calculated_amount ?? variant?.calculated_price?.original_amount ?? variant?.prices?.[0]?.amount
  return toMinorUnits(raw)
}

function variantsOf(product: Partial<Product>): { id: string; title: string }[] {
  return (product?.variants || [])
    .map((variant) => ({
      id: String(variant?.id || ""),
      title:
        String(variant?.title || "") ||
        (variant?.options || []).map((option) => option?.value).filter(Boolean).join(" / ") ||
        "Default",
    }))
    .filter((variant) => variant.id)
}

/* -------------------------------------------------------------------------- */
/* Card / tile templates                                                      */
/* -------------------------------------------------------------------------- */

function quickViewPayload(product: Partial<Product>): string {
  const variants = variantsOf(product)
  const data: QuickViewData = {
    variantId: variants[0]?.id || "",
    title: String(product?.title || ""),
    thumbnail: imageOf(product),
    handle: String(product?.handle || ""),
    unit_price: priceOf(product),
    variant_title: variants[0]?.title,
    variants,
  }
  return encodeURIComponent(JSON.stringify(data))
}

export function productCardTemplate(product: Partial<Product>): string {
  const title = String(product?.title || product?.handle || "")
  const handle = String(product?.handle || "")
  const image = imageOf(product)
  const hover = hoverImageOf(product)
  const usd = priceOf(product)
  const sale = usd ? Math.round(usd / 2) : 0
  const variants = variantsOf(product)
  const categories = (product?.categories || [])
    .map((category) => category?.handle || category?.id)
    .filter(Boolean)
    .join(" ")
  const href = `/products/${escapePath(handle)}`
  const hasOptions = variants.length > 1

  const media = image
    ? `<img class="media__img" src="${escapeHtml(cardSrc(image))}" alt="${escapeHtml(title)}" width="400" height="400" loading="lazy" decoding="async" />${
        hover
          ? `<img class="media__img pc-hover" src="${escapeHtml(cardSrc(hover))}" alt="" width="400" height="400" loading="lazy" decoding="async" />`
          : ""
      }`
    : `<span class="pc-media__placeholder" role="img" aria-label="No image available"></span>`

  const cta = variants.length
    ? `<button class="choose-options" type="button" data-action="quickview">${
        hasOptions ? "Choose options" : "Add to cart"
      }</button>`
    : `<a class="choose-options" href="${href}">View</a>`

  const price = sale
    ? `<span class="pc-price product-card-price"><span class="pc-from">From</span>${escapeHtml(formatMoney(sale))}</span>`
    : ""
  const compare = usd
    ? `<span class="pc-compare" data-price-strike>${escapeHtml(formatMoney(usd))}</span>`
    : ""

  return `<article class="product-card card" data-qv="${quickViewPayload(product)}" data-price-usd="${usd}" data-title="${escapeHtml(title)}" data-cats="${escapeHtml(categories)}" data-id="${escapeHtml(String(product?.id || ""))}">
    <div class="pc-media">
      <a class="pc-media__link" href="${href}" aria-label="${escapeHtml(title)}">${media}</a>
      <button class="wish-btn" type="button" data-wish
        data-wish-id="${escapeHtml(String(product?.id || ""))}"
        data-wish-handle="${escapeHtml(handle)}"
        data-wish-title="${escapeHtml(title)}"
        data-wish-img="${escapeHtml(image)}"
        data-wish-price="${usd}"
        aria-pressed="false" aria-label="Add to wishlist"><span data-wish-glyph aria-hidden="true">♡</span></button>
      ${usd ? `<span class="sale-badge">Sale</span>` : ""}
      ${cta}
    </div>
    <a href="${href}" class="pc-info">
      <h3 class="pc-title">${escapeHtml(title)}</h3>
      <div class="stars" data-review-product="${escapeHtml(String(product?.id || ""))}"></div>
      ${price ? `<p class="pc-price-row">${price}${compare}</p>` : ""}
    </a>
  </article>`
}

function tileTemplate(category: ProductCategory, image: string): string {
  const href = `/collections/${escapePath(category.handle)}`
  const name = escapeHtml(String(category.name || ""))
  const thumb = image ? cardSrc(image, 400) : ""
  return `<a href="${href}" class="shopby-tile card">
    <span class="shopby-media">
      ${
        thumb
          ? `<img class="media__img" src="${escapeHtml(thumb)}" alt="${name}" width="400" height="400" loading="lazy" decoding="async" />`
          : `<span class="shopby-media__placeholder">${name}</span>`
      }
    </span>
    <span class="shopby-heading"><span class="shopby-heading__title truncate">${name}</span></span>
  </a>`
}

function emptyGridTemplate(message: string, hint: string): string {
  return `<div class="empty-state empty-state--inline">
    <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m0 0 2.6-3.5A2 2 0 0 1 7.2 3.6h9.6a2 2 0 0 1 1.6.9L21 8M3 8h18M9.5 12.5h5"/></svg>
    <p class="empty-state__title">${escapeHtml(message)}</p>
    <p class="empty-state__body">${escapeHtml(hint)}</p>
    <div class="empty-state__actions"><a class="btn btn-outline" href="/collections">Browse all collections</a></div>
  </div>`
}

/* -------------------------------------------------------------------------- */
/* Grid state                                                                 */
/* -------------------------------------------------------------------------- */

function cardIsIncomplete(card: Element): boolean {
  const title = ($(".pc-title", card)?.textContent || "").trim()
  const price = Number(card.getAttribute("data-price-usd") || 0)
  return !title || !price
}

function gridNeedsHydration(grid: Element): boolean {
  const cards = $$(".product-card", grid)
  if (!cards.length) return true
  return cards.filter(cardIsIncomplete).length >= Math.ceil(cards.length / 2)
}

function setGridStatus(message: string): void {
  for (const grid of $$<HTMLElement>("[data-hydrate-products]")) {
    if (grid.querySelector(".product-card")) continue
    const placeholder = $<HTMLElement>("[data-grid-status]", grid)
    if (placeholder) placeholder.textContent = message
  }
}

function fillGrids(products: Product[], home: boolean): void {
  for (const grid of $$<HTMLElement>("[data-hydrate-products]")) {
    const isHome = grid.getAttribute("data-hydrate-products") === "home"
    const hasCards = grid.querySelectorAll(".product-card").length > 0
    if (hasCards && !(isHome && home && gridNeedsHydration(grid))) continue

    const status = $<HTMLElement>("[data-grid-status]", grid)
    if (status) status.remove()

    if (!products.length) {
      if (!hasCards) {
        grid.innerHTML = emptyGridTemplate(
          "No figures here yet",
          "The catalogue is empty right now. Check the publishable key is linked to a sales channel that has products.",
        )
      }
      continue
    }

    const list = isHome && home ? mixAcrossCategories(products, PAGE_SIZE) : products
    grid.innerHTML = list.map(productCardTemplate).join("")
  }
}

function fillTiles(categories: ProductCategory[], products: Product[]): void {
  const shop = shopCategories(categories)
  const byCategory: Record<string, Product[]> = {}
  for (const product of products) {
    for (const category of product.categories || []) {
      if (category.id) (byCategory[category.id] ||= []).push(product)
      if (category.handle) (byCategory[category.handle] ||= []).push(product)
    }
  }
  const html = shop
    .map((category) =>
      tileTemplate(category, imageOf(firstIn(byCategory, category.id) || firstIn(byCategory, category.handle))),
    )
    .join("")

  for (const grid of $$<HTMLElement>("[data-hydrate-cats]")) {
    if (grid.querySelector(".shopby-tile")) continue
    const status = $<HTMLElement>("[data-grid-status]", grid)
    if (status) status.remove()
    // No categories → replace the SSR skeletons with an explanation instead of
    // leaving a shimmering grid that will never resolve.
    grid.innerHTML =
      html ||
      emptyGridTemplate(
        "No collections yet",
        "Medusa returned no product categories. Create them in Admin → Products → Categories, or link the publishable key to a sales channel that has them.",
      )
  }
}

function fillAz(categories: ProductCategory[]): void {
  const shop = shopCategories(categories)
  const groups: { letter: string; items: ProductCategory[] }[] = []
  for (const category of shop) {
    const letter = String(category.name || "#").charAt(0).toUpperCase()
    const key = /[A-Z]/.test(letter) ? letter : "#"
    const last = groups[groups.length - 1]
    if (last && last.letter === key) last.items.push(category)
    else groups.push({ letter: key, items: [category] })
  }
  const html = groups
    .map(
      (group) => `<div class="az-group"><p class="az-letter">${escapeHtml(group.letter)}</p>${group.items
        .map((category) => `<a class="az-link truncate" href="/collections/${escapePath(category.handle)}">${escapeHtml(String(category.name))}</a>`)
        .join("")}</div>`,
    )
    .join("")

  const desktop = $<HTMLElement>("[data-az-dropdown]")
  if (desktop && !desktop.querySelector("a") && html) desktop.innerHTML = html
  const mobile = $<HTMLElement>("[data-az-mobile]")
  if (mobile && !mobile.querySelector("a") && html) mobile.innerHTML = html
}

/* -------------------------------------------------------------------------- */
/* Ordering                                                                   */
/* -------------------------------------------------------------------------- */

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Spread the homepage mix across categories instead of showing one series. */
function mixAcrossCategories(products: Product[], take = PAGE_SIZE): Product[] {
  const byCategory: Record<string, Product[]> = {}
  for (const product of products) {
    const keys = (product.categories || [])
      .map((category) => category.id || category.handle)
      .filter((key): key is string => Boolean(key))
    for (const key of keys.length ? keys : ["_"]) (byCategory[key] ||= []).push(product)
  }
  const keys = shuffle(Object.keys(byCategory))
  const seen = new Set<string>()
  const out: Product[] = []
  for (let pass = 0; pass < 3; pass += 1) {
    for (const key of keys) {
      const product = shuffle(byCategory[key] || []).find((entry) => entry?.id && !seen.has(entry.id))
      if (!product) continue
      seen.add(product.id)
      out.push(product)
      if (out.length >= take) return shuffle(out)
    }
  }
  return shuffle(out).slice(0, take)
}

function sortCards(cards: HTMLElement[], mode: string): HTMLElement[] {
  const copy = [...cards]
  const title = (card: HTMLElement) => card.getAttribute("data-title") || ""
  const price = (card: HTMLElement) => Number(card.getAttribute("data-price-usd") || 0)
  copy.sort((a, b) => {
    if (mode === "az") return title(a).localeCompare(title(b))
    if (mode === "za") return title(b).localeCompare(title(a))
    if (mode === "price-asc") return price(a) - price(b)
    if (mode === "price-desc") return price(b) - price(a)
    return 0
  })
  return copy
}

function bindSort(): void {
  const select = $<HTMLSelectElement>("[data-collection-sort]")
  const grid = $<HTMLElement>("[data-product-grid]")
  if (!select || !grid) return

  select.addEventListener("change", () => {
    const cards = $$<HTMLElement>(".product-card", grid)
    sortCards(cards, select.value).forEach((card) => grid.appendChild(card))
    announceCount(`${cards.length} products, sorted`)
  })
}

function announceCount(message: string): void {
  const live = $<HTMLElement>("[data-product-count]")
  if (live) live.textContent = message
}

/* -------------------------------------------------------------------------- */
/* Infinite scroll                                                            */
/* -------------------------------------------------------------------------- */

interface InfiniteState {
  loading: boolean
  done: boolean
  categoryIds: string[] | null
  regionId: string
}

function bindInfiniteScroll(handle: string): void {
  const wrap = $<HTMLElement>("[data-load-more]")
  const button = $<HTMLButtonElement>("[data-load-more-btn]")
  const status = $<HTMLElement>("[data-load-more-status]")
  const grid = $<HTMLElement>("[data-product-grid]")
  const sentinel = $<HTMLElement>("[data-load-more-sentinel]") || wrap
  if (!wrap || !button || !grid || wrap.dataset.bound) return
  wrap.dataset.bound = "1"
  // `next()` below is a hoisted function declaration, so TypeScript will not
  // carry the narrowing from the guard into it — re-bind to a non-null const.
  const gridEl: HTMLElement = grid

  const state: InfiniteState = { loading: false, done: false, categoryIds: null, regionId: "" }

  const finish = () => {
    state.done = true
    wrap.hidden = true
  }

  const busy = (on: boolean, error = "") => {
    wrap.hidden = false
    state.loading = on
    if (status) {
      status.hidden = !on && !error
      status.innerHTML = on
        ? `<span class="spinner" aria-hidden="true"></span><span>Loading next page…</span>`
        : error
          ? `<span role="alert">${escapeHtml(error)}</span>`
          : ""
    }
    button.hidden = on || state.done
    button.disabled = on
    button.textContent = error ? "Retry" : "Load more"
  }

  async function resolveFilters(): Promise<void> {
    if (state.categoryIds) return
    state.categoryIds = []
    try {
      const regions = await medusaGet<{ regions?: { id: string }[] }>("/store/regions?limit=5")
      state.regionId = regions.regions?.[0]?.id || ""
    } catch {
      /* region is optional */
    }
    if (!handle || handle === "new-arrivals") return
    try {
      const data = await medusaGet<{ product_categories?: ProductCategory[] }>(
        `/store/product-categories?limit=200&fields=${encodeURIComponent(CATEGORY_FIELDS)}`,
      )
      const categories = data.product_categories || []
      const category = categories.find((entry) => entry.handle === handle)
      if (category) {
        state.categoryIds = [
          category.id,
          ...categories.filter((entry) => entry.parent_category_id === category.id).map((entry) => entry.id),
        ]
      }
    } catch {
      /* unfiltered page */
    }
  }

  const nearViewport = () => {
    if (!sentinel) return false
    return sentinel.getBoundingClientRect().top < window.innerHeight + 900
  }

  async function next(): Promise<void> {
    if (state.loading || state.done) return
    busy(true)
    try {
      await resolveFilters()
      const offset = gridEl.querySelectorAll(".product-card").length
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        fields: PRODUCT_FIELDS,
      })
      if (state.regionId) params.set("region_id", state.regionId)
      for (const id of state.categoryIds || []) params.append("category_id[]", id)

      const data = await medusaGet<{ products?: Product[]; count?: number }>(`/store/products?${params}`)
      const list = data.products || []
      const have = new Set(
        $$<HTMLElement>("[data-id]", gridEl).map((card) => card.getAttribute("data-id") || ""),
      )
      const fresh = list.filter((product) => product?.id && !have.has(product.id))

      if (fresh.length) {
        gridEl.insertAdjacentHTML("beforeend", fresh.map(productCardTemplate).join(""))
        document.dispatchEvent(new CustomEvent("toonhub:catalog"))
      }

      const now = gridEl.querySelectorAll(".product-card").length
      const total = Number(data.count)
      announceCount(Number.isFinite(total) && total > 0 ? `${total} products` : `${now} products`)

      // Medusa's `count` is unreliable (often equals the page size) — stop when
      // a page comes back short or repeats, not when `count` says so.
      if (list.length < PAGE_SIZE) return finish()
      if (!fresh.length) {
        if (now > offset) {
          busy(false)
          if (nearViewport()) queueMicrotask(() => void next())
          return
        }
        return finish()
      }
      busy(false)
      if (nearViewport()) queueMicrotask(() => void next())
    } catch (error) {
      busy(false, `Could not load the next page. ${error instanceof Error ? error.message : ""}`)
    }
  }

  wrap.hidden = false
  button.hidden = false
  button.addEventListener("click", () => void next())

  if (sentinel && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void next()
      },
      { rootMargin: "800px 0px", threshold: 0 },
    )
    observer.observe(sentinel)
  }
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

async function load(): Promise<void> {
  const handle =
    $<HTMLElement>("[data-collection-handle]")?.getAttribute("data-collection-handle") || ""
  if (handle) {
    bindInfiniteScroll(handle)
    bindSort()
  }

  const homeGrid = $<HTMLElement>('[data-hydrate-products="home"]')
  const serverRendered =
    homeGrid &&
    !gridNeedsHydration(homeGrid) &&
    Boolean($("[data-az-dropdown] a, [data-az-mobile] a")) &&
    Boolean($("[data-hydrate-cats] .shopby-tile"))

  if (!handle && serverRendered) return
  if (!handle && !homeGrid && !$("[data-hydrate-cats]") && !$("[data-hydrate-products]")) return

  setGridStatus("Loading figures…")

  try {
    const categoriesData = await medusaGet<{ product_categories?: ProductCategory[] }>(
      `/store/product-categories?limit=200&fields=${encodeURIComponent(CATEGORY_FIELDS)}`,
    )
    const categories = categoriesData.product_categories || []
    fillAz(categories)

    const onCollection = Boolean(handle)
    let regionId = ""
    try {
      const regions = await medusaGet<{ regions?: { id: string }[] }>("/store/regions?limit=5")
      regionId = regions.regions?.[0]?.id || ""
    } catch {
      /* optional */
    }

    const params = new URLSearchParams({
      limit: onCollection ? String(PAGE_SIZE) : "48",
      fields: PRODUCT_FIELDS,
    })
    if (regionId) params.set("region_id", regionId)

    if (handle && handle !== "new-arrivals") {
      const category = categories.find((entry) => entry.handle === handle)
      const ids = category
        ? [category.id, ...categories.filter((entry) => entry.parent_category_id === category.id).map((entry) => entry.id)]
        : []
      for (const id of ids) params.append("category_id[]", id)
      const titleEl = $<HTMLElement>("[data-collection-title]")
      if (titleEl && category?.name) titleEl.textContent = `Collection: ${category.name}`
    }

    const productsData = await medusaGet<{ products?: Product[]; count?: number }>(
      `/store/products?${params}`,
    )
    let products = productsData.products || []

    if (homeGrid && gridNeedsHydration(homeGrid)) {
      const mixed = await mixHomeFromCategories(categories, regionId)
      products = mixed.length ? mixed : mixAcrossCategories(products, PAGE_SIZE)
    }

    fillTiles(categories, products)
    fillGrids(products, Boolean(homeGrid))

    const total = Number(productsData.count ?? products.length) || products.length
    if ($("[data-product-count]")) announceCount(`${total} products`)
    document.dispatchEvent(new CustomEvent("toonhub:catalog"))
  } catch (error) {
    setGridStatus(
      `Could not load the catalogue: ${error instanceof Error ? error.message : "unknown error"}`,
    )
    const unreachable = emptyGridTemplate(
      "The catalogue is unreachable",
      "We could not reach the store backend. If you are the site owner, check MEDUSA_URL and MEDUSA_PUBLISHABLE_KEY, or set STORE_CORS to include this origin.",
    )
    for (const grid of $$<HTMLElement>("[data-hydrate-products]")) {
      if (grid.querySelector(".product-card")) continue
      const status = $<HTMLElement>("[data-grid-status]", grid)
      if (status) status.remove()
      grid.innerHTML = unreachable
    }
    // Tile grids shimmer forever otherwise — give them the same explanation.
    for (const grid of $$<HTMLElement>("[data-hydrate-cats]")) {
      if (grid.querySelector(".shopby-tile")) continue
      const status = $<HTMLElement>("[data-grid-status]", grid)
      if (status) status.remove()
      grid.innerHTML = unreachable
    }
  }
}

async function mixHomeFromCategories(categories: ProductCategory[], regionId: string): Promise<Product[]> {
  const shop = shuffle(shopCategories(categories)).slice(0, 12)
  if (!shop.length) return []
  const batches = await Promise.all(
    shop.map(async (category) => {
      try {
        const params = new URLSearchParams({ limit: "4", fields: PRODUCT_FIELDS })
        if (regionId) params.set("region_id", regionId)
        params.append("category_id[]", category.id)
        const data = await medusaGet<{ products?: Product[] }>(`/store/products?${params}`)
        return data.products || []
      } catch {
        return [] as Product[]
      }
    }),
  )
  const seen = new Set<string>()
  const out: Product[] = []
  for (let pass = 0; pass < 2; pass += 1) {
    for (const list of batches) {
      const product = shuffle(list).find((entry) => entry?.id && !seen.has(entry.id) && (entry.title || entry.handle))
      if (!product) continue
      seen.add(product.id)
      out.push(product)
      if (out.length >= PAGE_SIZE) return shuffle(out)
    }
  }
  return shuffle(out)
}

ready(() => {
  // Hydration is a rescue path — never let it compete with LCP.
  whenIdle(() => void load(), 2500)
})
