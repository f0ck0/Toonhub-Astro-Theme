/**
 * SEO plumbing shared by `Base.astro` and the page components.
 *
 * Goals:
 * - pages declare *data*, the layout turns it into tags (single source of truth
 *   for `<title>`, canonical, Open Graph, Twitter, robots and JSON-LD);
 * - every URL is derived from `Astro.site` so the theme can be deployed to a
 *   preview host or a new domain without editing strings;
 * - structured data is only emitted for facts we actually have (a Product node
 *   never carries an `aggregateRating` unless Medusa returned review stats).
 */

import type { JsonLd, Product, ProductCategory, SeoMeta } from "../types"
import { SITE } from "./site"
import { OG_DEFAULT_IMAGE, resolveImageSource } from "./images"

export const BRAND_SUFFIX = SITE.name

/** 155 chars is the safe SERP snippet length. */
export const DESCRIPTION_MAX = 155
export const TITLE_MAX = 60

export function absoluteUrl(href: string | URL, site?: URL | string | null): string {
  const origin = String(site || SITE.url || `https://${SITE.domain}`).replace(/\/$/, "")
  if (!href) return origin
  if (href instanceof URL) return href.origin === "null" ? `${origin}${href.pathname}` : href.href
  const value = String(href).trim()
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("mailto:") || value.startsWith("data:")) {
    return value
  }
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`
}

/** Resolve an image source to a root-relative or absolute URL string. */
export function imageUrlForMeta(image: SeoMeta["image"], site?: URL | string | null): string {
  const resolved = resolveImageSource(image)
  if (resolved.kind === "empty") return absoluteUrl(OG_DEFAULT_IMAGE, site)
  const path = resolved.kind === "asset" ? resolved.src.src : resolved.src
  return absoluteUrl(path, site)
}

export function withBrand(title?: string | null): string {
  const clean = String(title || "").trim()
  if (!clean) return SITE.defaultTitle
  if (clean === BRAND_SUFFIX) return clean
  if (clean.toLowerCase().endsWith(BRAND_SUFFIX.toLowerCase())) return clean
  return `${clean} — ${BRAND_SUFFIX}`
}

export function stripHtml(html?: string | null): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export function clamp(text: string, max: number): string {
  const clean = String(text || "").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:!?—-]+$/, "")}…`
}

export function metaDescription(description?: string | null): string {
  const text = stripHtml(description) || SITE.description
  return clamp(text, DESCRIPTION_MAX)
}

/** Noindexed surfaces: carts, checkout, accounts, filtered result pages. */
export const NOINDEX = "noindex, nofollow"

/* -------------------------------------------------------------------------- */
/* JSON-LD                                                                    */
/* -------------------------------------------------------------------------- */

export function websiteJsonLd(site?: URL | string | null): JsonLd {
  const url = absoluteUrl("/", site)
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}#website`,
    name: SITE.name,
    url,
    description: SITE.description,
    inLanguage: SITE.locale,
    publisher: { "@id": `${url}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

export function organizationJsonLd(site?: URL | string | null): JsonLd {
  const url = absoluteUrl("/", site)
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}#organization`,
    name: SITE.name,
    url,
    email: SITE.email,
    logo: imageUrlForMeta(OG_DEFAULT_IMAGE, site),
    sameAs: [SITE.instagram, SITE.tiktok].filter((href) => /^https?:\/\//.test(href)),
  }
}

export interface BreadcrumbCrumb {
  name: string
  href: string
}

export function breadcrumbJsonLd(
  crumbs: BreadcrumbCrumb[],
  site?: URL | string | null,
): JsonLd | null {
  const items = crumbs.filter((c) => c?.name && c?.href)
  if (!items.length) return null
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: stripHtml(crumb.name),
      item: absoluteUrl(crumb.href, site),
    })),
  }
}

export interface ProductJsonLdInput {
  product: Product
  /** Minor units in the display currency. */
  price: number
  currency: string
  images: string[]
  rating?: number
  reviewCount?: number
  site?: URL | string | null
}

/** Product node; `aggregateRating` only appears when real review data exists. */
export function productJsonLd({
  product,
  price,
  currency,
  images,
  rating,
  reviewCount,
  site,
}: ProductJsonLdInput): JsonLd {
  const url = absoluteUrl(`/products/${product.handle}`, site)
  const offer: JsonLd = {
    "@type": "Offer",
    url,
    priceCurrency: String(currency || "usd").toUpperCase(),
    price: (Math.max(0, Number(price) || 0) / 100).toFixed(2),
    availability: `https://schema.org/${
      (product.variants?.[0]?.inventory_quantity ?? 1) > 0 ? "InStock" : "OutOfStock"
    }`,
    itemCondition: "https://schema.org/NewCondition",
  }
  const node: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    url,
    sku: product.variants?.[0]?.sku || product.id,
    description: clamp(stripHtml(product.subtitle || product.description) || SITE.description, 300),
    image: images.length ? images.map((src) => absoluteUrl(src, site)) : undefined,
    brand: { "@type": "Brand", name: SITE.name },
    category: (product.categories || [])
      .map((c) => c.name)
      .filter(Boolean)
      .join(", ") || undefined,
    offers: offer,
  }
  if (Number(reviewCount) > 0 && Number(rating) > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(rating).toFixed(1),
      reviewCount: Number(reviewCount),
      bestRating: 5,
      worstRating: 1,
    }
  }
  return node
}

export function collectionPageJsonLd(
  category: ProductCategory | null,
  site?: URL | string | null,
): JsonLd | null {
  if (!category) return null
  const url = absoluteUrl(`/collections/${category.handle}`, site)
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: category.name,
    url,
    description: clamp(stripHtml(category.description) || "", DESCRIPTION_MAX) || undefined,
    isPartOf: { "@id": `${absoluteUrl("/", site)}#website` },
  }
}

/**
 * Search results page node.
 *
 * Modelled as a `CollectionPage` whose name carries the query. The site-wide
 * `SearchAction` lives on the WebSite node (`websiteJsonLd`), so it is not
 * duplicated here. Pages emit this with `noindex` — the value of the node is
 * disambiguation in logs and rich-result tooling, not indexing.
 */
export function searchPageJsonLd(
  term: string | null,
  site?: URL | string | null,
): JsonLd {
  const query = String(term || "").trim()
  const url = absoluteUrl(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`, site)
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl("/search", site)}#search`,
    name: query ? `Search: ${clamp(query, TITLE_MAX)}` : "Search",
    url,
    isPartOf: { "@id": `${absoluteUrl("/", site)}#website` },
  }
}

export interface BlogPostingInput {
  title: string
  description?: string | null
  pubDate: Date
  slug: string
  image?: SeoMeta["image"]
  site?: URL | string | null
}

export function blogPostingJsonLd({
  title,
  description,
  pubDate,
  slug,
  image,
  site,
}: BlogPostingInput): JsonLd {
  const url = absoluteUrl(`/blog/${slug}`, site)
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: clamp(title, 110),
    description: metaDescription(description),
    datePublished: pubDate.toISOString(),
    dateModified: pubDate.toISOString(),
    image: imageUrlForMeta(image, site),
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@id": `${absoluteUrl("/", site)}#organization` },
    mainEntityOfPage: url,
  }
}

/** Merge page-provided JSON-LD with the site-wide graph, dropping nulls. */
export function jsonLdGraph(
  blocks: (JsonLd | JsonLd[] | null | undefined)[],
): JsonLd[] {
  const flat: JsonLd[] = []
  for (const block of blocks) {
    if (!block) continue
    if (Array.isArray(block)) flat.push(...block.filter(Boolean))
    else flat.push(block)
  }
  return flat
}
