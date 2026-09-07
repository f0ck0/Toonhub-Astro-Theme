/**
 * Shared domain types for the Toonhub storefront.
 *
 * Everything that crosses a component boundary (Medusa payloads, cart lines,
 * review rows, SEO metadata) is described here so `.astro` frontmatter can be
 * typed instead of falling back to `any`.
 *
 * Medusa returns snake_case JSON; we keep those names so API payloads can be
 * cast without a mapping layer.
 */

import type { ImageMetadata } from "astro"

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Anything `<Media />` accepts:
 * - an Astro-imported asset (build-time optimised through `astro:assets`)
 * - a URL string (local `public/` path, `/img/…` endpoint, or remote CDN)
 */
export type ImageSource = ImageMetadata | string | null | undefined

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

export interface ProductImage {
  id?: string
  url: string
}

export interface VariantOption {
  id?: string
  title?: string
  value?: string
}

export interface VariantPrice {
  amount?: number
  currency_code?: string
  min_quantity?: number | null
  max_quantity?: number | null
}

export interface CalculatedPrice {
  calculated_amount?: number
  original_amount?: number
  currency_code?: string
}

export interface ProductVariant {
  id: string
  title?: string
  sku?: string
  inventory_quantity?: number
  manage_inventory?: boolean
  allow_backorder?: boolean
  options?: VariantOption[]
  prices?: VariantPrice[]
  calculated_price?: CalculatedPrice | null
}

export interface ProductOption {
  id?: string
  title?: string
  values?: { value?: string }[]
}

export interface ProductCategory {
  id: string
  name: string
  handle?: string
  description?: string | null
  parent_category_id?: string | null
  category_children?: ProductCategory[]
  /** Only present when the category query asks for `*products`. */
  products?: ProductStub[]
}

/** Lightweight category→product reference used while building tiles. */
export interface ProductStub {
  id?: string
  title?: string
  handle?: string
  thumbnail?: string
}

export interface Product {
  id: string
  title: string
  handle: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  images?: (ProductImage | string)[]
  variants?: ProductVariant[]
  options?: ProductOption[]
  categories?: ProductCategory[]
  metadata?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
  /* Review plugin fields — never invented, see `productReviews()`. */
  reviews_count?: number
  review_count?: number
  average_rating?: number
  rating?: number
}

export interface PagedProducts {
  products: Product[]
  count: number
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

export interface Review {
  id?: string
  product_id?: string
  rating?: number
  stars?: number
  name?: string
  first_name?: string
  title?: string
  content?: string
  comment?: string
  body?: string
  response?: string
  reply?: string
  created_at?: string
  images?: unknown[]
  photos?: unknown[]
  review_images?: unknown[]
}

export interface ReviewSummary {
  reviews: Review[]
  count: number
  average: number
}

/* -------------------------------------------------------------------------- */
/* Cart                                                                       */
/* -------------------------------------------------------------------------- */

export interface CartItem {
  /** Client-side line id (`variantId-timestamp`); Medusa uses `id` too. */
  id: string
  title: string
  thumbnail?: string
  variant_id?: string
  quantity: number
  /** Minor units in USD (cents). */
  unit_price: number
  handle?: string
  variant_title?: string
}

export interface AddToCartPayload {
  variantId: string
  quantity?: number
  title: string
  thumbnail?: string
  handle?: string
  unit_price: number
  variant_title?: string
}

/** Payload embedded in `data-qv` on a product card for the quick-view dialog. */
export interface QuickViewData extends AddToCartPayload {
  variants?: { id: string; title: string }[]
}

export interface WishlistItem {
  id: string
  handle?: string | null
  title?: string | null
  thumbnail?: string | null
  unit_price?: number
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

export interface NavLink {
  label: string
  href: string
  /** Render with `aria-current="page"` when the route matches. */
  match?: "exact" | "prefix"
  external?: boolean
}

export interface AzGroup {
  letter: string
  items: ProductCategory[]
}

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

export type CurrencyCode = "usd" | "eur" | "gbp" | "aud" | "cad" | "jpy" | "cny" | "hkd"

export interface PricePair {
  /** Compare-at price in minor units of the active currency. */
  original: number
  /** Selling price in minor units of the active currency. */
  sale: number
}

/* -------------------------------------------------------------------------- */
/* SEO                                                                        */
/* -------------------------------------------------------------------------- */

export type JsonLd = Record<string, unknown>

/**
 * Contract between a page and `Base.astro`.
 * Every field is optional with a sane default, so pages only declare the delta.
 */
export interface SeoMeta {
  /** Full `<title>` including the brand suffix. */
  title?: string
  /** 50–160 chars; truncated by `Base.astro` if longer. */
  description?: string
  /** Absolute or root-relative; resolved against `Astro.site`. */
  image?: ImageSource
  /** Overrides `og:type` (default `website`; product pages pass `product`). */
  ogType?: "website" | "article" | "product"
  /** Extra `<link rel="alternate">` entries (hreflang, canonical overrides). */
  alternates?: { hreflang?: string; href: string; media?: string }[]
  /**
   * Overrides the canonical URL. Filtered result pages (search, sorted
   * collections) should point at their unfiltered equivalent.
   */
  canonical?: string
  /** `noindex,nofollow` for cart/checkout/account/search result pages. */
  robots?: string
  /** Structured data blocks appended to the page's JSON-LD graph. */
  jsonLd?: JsonLd | JsonLd[]
  /** `<html lang>` — BCP-47. */
  lang?: string
  /** LCP candidate: preloaded with `fetchpriority="high"`. */
  lcpImage?: ImageSource
  /** Preconnect origins the page will talk to at runtime. */
  preconnect?: string[]
}
