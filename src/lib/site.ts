/**
 * Storefront identity, copy and catalogue-tree helpers.
 *
 * Design mirrors tsukiyashop.com (Shopify Dawn, black canvas) but every string
 * here is first-party. Anything user-facing that a translator would touch lives
 * in `src/i18n/ui.ts` instead — this module holds brand constants only.
 */

import type { AzGroup, Product, ProductCategory } from "../types"

export const SITE = {
  name: "TOONHUB",
  domain: "toonhubshop.com",
  /** Canonical origin. Overridden at runtime by `Astro.site` when configured. */
  url: "https://toonhubshop.com",
  /** BCP-47 default locale — matches `i18n.defaultLocale` in astro.config. */
  locale: "en",
  tagline: "World's Leading Anime Figures Collection",
  description:
    "Shop premium anime figures, statues and collectibles. Free worldwide shipping. Buy 1 get the 2nd half price.",
  defaultTitle: "TOONHUB — Premium Anime Figures & Collectibles",
  email: "hello@toonhubshop.com",
  instagram: "https://instagram.com/",
  tiktok: "https://www.tiktok.com/",
  announcements: [
    "World's Leading Anime Figures Collection",
    "Free Shipping Ends Soon",
    "Buy 1 Get the 2nd Figure 50% Off",
  ],
  offer: "Limited Offer: Buy 1 Get 2nd Half Price. World Wide Free Shipping.",
  offerWarn:
    "Please confirm the figure edition and shipping address before you place the order.",
  marquee:
    "✅ 30-Day Guarantee   🚚 Free Shipping World Wide   🎁 Buy 1 Get Second 50% Off  •  For all figures",
} as const

/** Root Medusa category that holds every IP (series) sub-category. */
export const FIGURES_HANDLE = "figures-100028"

/** Rolling clearance window, in days, seeded per visitor. */
export const SALE_WINDOW_DAYS = 3

export interface ReviewStats {
  rating: number
  count: number
}

/**
 * Real Medusa review stats on a product, if the reviews plugin attached them.
 * Never invent numbers: anything missing or non-positive collapses to zero so
 * the UI can hide the widget instead of showing fake social proof.
 */
export function productReviews(product: Product | null | undefined): ReviewStats {
  const meta = (product?.metadata || {}) as Record<string, unknown>
  const count = Number(
    product?.reviews_count ??
      product?.review_count ??
      meta.reviews_count ??
      meta.review_count ??
      0,
  )
  const rating = Number(
    product?.average_rating ?? product?.rating ?? meta.average_rating ?? meta.rating ?? 0,
  )
  return {
    count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
    rating: Number.isFinite(rating) && rating > 0 ? Math.min(5, rating) : 0,
  }
}

export interface CategoryTree {
  parentCats: ProductCategory[]
  childMap: Record<string, ProductCategory[]>
}

export function groupCategories(categories: ProductCategory[]): CategoryTree {
  const list = Array.isArray(categories) ? categories : []
  const parentCats = list.filter((c) => !c?.parent_category_id)
  const childMap: Record<string, ProductCategory[]> = {}
  for (const c of list) {
    const parent = c?.parent_category_id
    if (!parent) continue
    ;(childMap[parent] ||= []).push(c)
  }
  for (const key of Object.keys(childMap)) {
    childMap[key].sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }
  return { parentCats, childMap }
}

/**
 * Categories used in Shop All / Anime List.
 * These are Medusa product categories for browsing — not products themselves.
 * Prefer leaf (IP) categories under Figures; otherwise all non-root categories.
 * Always returns an array — callers render an empty state, never crash.
 */
export function shopCategories(categories: ProductCategory[]): ProductCategory[] {
  const list = Array.isArray(categories) ? categories : []
  if (!list.length) return []
  const { parentCats, childMap } = groupCategories(list)
  const figures = list.find(
    (c) =>
      c?.handle === FIGURES_HANDLE ||
      /^figures?(-\d+)?$/i.test(String(c?.handle || "")) ||
      /^figures?$/i.test(String(c?.name || "")),
  )
  let picked: ProductCategory[] = []
  if (figures && childMap[figures.id]?.length) {
    picked = childMap[figures.id]
  } else {
    const leaves = list.filter((c) => c?.parent_category_id)
    picked = leaves.length ? leaves : parentCats.length ? parentCats : list
  }
  return picked
    .filter((c) => c?.id && c?.name)
    .sort((a, b) =>
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }),
    )
}

/** A–Z bucketing for the "Anime List" dropdown. */
export function groupAz(categories: ProductCategory[]): AzGroup[] {
  const groups: AzGroup[] = []
  for (const cat of shopCategories(categories)) {
    const letter = String(cat.name || "#").charAt(0).toUpperCase()
    const key = /[A-Z]/.test(letter) ? letter : "#"
    const last = groups[groups.length - 1]
    if (last && last.letter === key) last.items.push(cat)
    else groups.push({ letter: key, items: [cat] })
  }
  return groups
}

/** Tile blurb for a category — deterministic, no data fetched. */
export function categoryBlurb(name: string): string {
  const clean = String(name || "").trim()
  if (!clean) return ""
  return `Shop our exclusive ${clean} figures — premium quality, worldwide shipping.`
}
