/**
 * Sitemap building blocks — pure functions so the URL policy is unit-testable.
 *
 * `src/pages/sitemap.xml.ts` fetches the live data (Medusa categories +
 * product handles, content-collection posts) and hands it to these helpers;
 * this module owns *which* paths belong in the sitemap and how they are
 * serialized.
 *
 * Rules encoded here:
 * - only **indexable** surfaces are listed. Cart / account / wishlist / search
 *   / checkout are `noindex` (see `Base.astro` usage) and must not appear.
 * - one canonical URL per page (locale is negotiated per visitor, so there are
 *   no `/ja/…` alternates to enumerate — see `src/lib/i18n.ts`).
 */

/** Public, indexable routes that always exist regardless of the catalogue. */
export const SITEMAP_STATIC_PATHS = [
  "/",
  "/collections",
  "/collections/new-arrivals",
  "/track-order",
  "/about",
  "/contact",
  "/care-guide",
  "/affiliate",
  "/blog",
  "/policies/refund-policy",
  "/policies/shipping-policy",
  "/policies/terms-of-service",
  "/policies/privacy-policy",
  "/policies/cancellation-policy",
] as const

export interface SitemapCategoryLike {
  handle?: string | null
}

export interface SitemapProductLike {
  handle?: string | null
  updated_at?: string | Date | null
  created_at?: string | Date | null
}

export interface SitemapPostLike {
  /** Content-collection id, identical to the public `/blog/<id>` slug. */
  id: string
  draft?: boolean | null
  pubDate?: Date | string | null
}

export interface SitemapSource {
  staticPaths?: readonly string[]
  categories?: readonly SitemapCategoryLike[]
  products?: readonly SitemapProductLike[]
  posts?: readonly SitemapPostLike[]
}

export interface SitemapEntry {
  /** Root-relative path (`/products/foo`). */
  loc: string
  /** ISO-8601 date (`YYYY-MM-DD`) when known. */
  lastmod?: string
}

/** `2024-05-01T10:20:30Z` → `2024-05-01`; invalid input → `undefined`. */
export function isoDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.valueOf())) return undefined
  return date.toISOString().slice(0, 10)
}

/**
 * Build the deduplicated entry list. Catalogue data comes last so static
 * routes always win ties; every entry is root-relative (the origin is only
 * applied at XML serialization time).
 */
export function buildSitemapEntries(source: SitemapSource): SitemapEntry[] {
  const entries: SitemapEntry[] = []
  const seen = new Set<string>()
  const push = (loc: string | null | undefined, lastmod?: string): void => {
    const clean = String(loc || "").trim()
    if (!clean || seen.has(clean)) return
    seen.add(clean)
    entries.push(lastmod ? { loc: clean, lastmod } : { loc: clean })
  }

  for (const path of source.staticPaths ?? SITEMAP_STATIC_PATHS) push(path)
  for (const category of source.categories ?? []) {
    if (category?.handle) push(`/collections/${category.handle}`)
  }
  for (const product of source.products ?? []) {
    if (product?.handle) push(`/products/${product.handle}`, isoDate(product.updated_at ?? product.created_at))
  }
  for (const post of source.posts ?? []) {
    if (!post?.id || post.draft) continue
    push(`/blog/${post.id.replace(/\/index$/, "")}`, isoDate(post.pubDate))
  }
  return entries
}

/** Escape the five XML metacharacters (handles are user-generated data). */
export function xmlEscape(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function renderSitemapXml(origin: string, entries: readonly SitemapEntry[]): string {
  const base = String(origin || "").replace(/\/+$/, "")
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : ""
      return `  <url>\n    <loc>${xmlEscape(`${base}${entry.loc}`)}</loc>${lastmod}\n  </url>`
    })
    .join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}
