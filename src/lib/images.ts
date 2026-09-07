/**
 * Image resolution helpers.
 *
 * Two source families exist in this storefront:
 *
 * 1. **First-party artwork** imported from `src/assets/**`. These become
 *    `ImageMetadata` and are optimised by `astro:assets` (AVIF/WebP, real
 *    srcset, intrinsic width/height) — see `<Media />`.
 * 2. **Catalogue artwork** served by Medusa (remote URLs). These are rendered
 *    with explicit dimensions and `unoptimized` because re-encoding a third
 *    party CDN through our own Node process would double bandwidth and CPU.
 *
 * Every helper here is null-safe: a missing image must degrade to a styled
 * placeholder, never to a broken `<img>` or a render error.
 */

import type { ImageMetadata } from "astro"
import type { ImageSource, Product, ProductCategory } from "../types"

/** All bundled collection artwork, keyed by file stem (`onepiece`, `bleach`, …). */
const COLLECTION_MODULES = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/collections/*.webp",
  { eager: true },
)

export const COLLECTION_ASSETS: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(COLLECTION_MODULES).map(([path, mod]) => {
    const stem = path.split("/").pop()!.replace(/\.webp$/i, "")
    return [stem, mod.default]
  }),
)

/** Medusa category handle → bundled artwork stem. */
export const COLLECTION_IMAGE_BY_HANDLE: Record<string, string> = {
  "one-piece-100029": "onepiece",
  "dragon-ball-100030": "dragonball",
  "naruto-100031": "solo-leveling",
  "demon-slayer-100032": "demon-slayer",
  "pok-mon-100033": "pokemon",
  "digimon-100034": "gundam",
  "bleach-100035": "bleach",
  "my-hero-academia-100036": "my-hero-acadamia",
  "jujutsu-kaisen-100037": "jujutsu-kaisen",
  "black-clover-100038": "black-clover",
  "tokyo-revengers-100039": "sailor-moon",
  "attack-on-titan-100041": "attack-on-titan",
  "chainsaw-man-100042": "chainsaw-man",
  "tokyo-ghoul-100043": "tokyo-ghoul",
  "blue-lock": "blue-lock",
  evangelion: "evangelion",
  "fairy-tail": "fairy-tail",
  dandadan: "dandadan",
}

/** Stable, absolute social-share card (public dir keeps the URL crawlable). */
export const OG_DEFAULT_IMAGE = "/images/og/og-default.webp"

export type ResolvedImage =
  | { kind: "asset"; src: ImageMetadata }
  | { kind: "remote"; src: string }
  | { kind: "local"; src: string }
  | { kind: "empty"; src: "" }

export function isRemoteUrl(src: string): boolean {
  return /^(https?:)?\/\//i.test(src) || src.startsWith("data:")
}

/**
 * URLs that are already optimised — or already served by Vite — and must not be
 * sent through the resizer:
 * - `/_astro/…` Astro's hashed build output (correct dimensions/format already)
 * - `/img/w…/…` this theme's own resizer endpoint (avoid double work)
 * - `/@fs/…`, `/@id/…` Vite dev URLs for imported assets (they carry
 *   `?origWidth=`/`?origHeight=` and are not files under `public/`)
 * - `.svg`/`.avif` sources, which the resizer would only re-encode
 */
export function isPreOptimizedUrl(src: string): boolean {
  const value = String(src || "")
  return (
    /^\/_astro\//.test(value) ||
    /^\/img\/w\d+\//.test(value) ||
    /^\/@(fs|id|vite)\//.test(value) ||
    /[?&]origWidth=/.test(value) ||
    /\.(svg|avif)(\?|$)/i.test(value)
  )
}

/**
 * Normalise any accepted image source into a discriminated union so `<Media />`
 * can pick the right rendering strategy without guessing.
 */
export function resolveImageSource(source: ImageSource): ResolvedImage {
  if (!source) return { kind: "empty", src: "" }
  if (typeof source === "object") {
    // Imported asset — `src` is always present on ImageMetadata.
    return source.src ? { kind: "asset", src: source } : { kind: "empty", src: "" }
  }
  const trimmed = String(source).trim()
  if (!trimmed) return { kind: "empty", src: "" }
  if (isRemoteUrl(trimmed)) return { kind: "remote", src: trimmed }
  return { kind: "local", src: trimmed.startsWith("/") ? trimmed : `/${trimmed}` }
}

/** Bundled artwork for a Medusa category handle, or `null` when unmapped. */
export function collectionAsset(handle?: string | null): ImageMetadata | null {
  const stem = COLLECTION_IMAGE_BY_HANDLE[String(handle || "")]
  return (stem && COLLECTION_ASSETS[stem]) || null
}

/**
 * Best available tile artwork for a category:
 * bundled artwork → first product thumbnail → `null`.
 */
export function categoryImage(category: ProductCategory | null | undefined): ImageSource {
  if (!category) return null
  const bundled = collectionAsset(category.handle)
  if (bundled) return bundled
  const thumb = (category.products || []).find((p) => p?.thumbnail)?.thumbnail
  return thumb || null
}

/** First usable image on a product (thumbnail, else first `images[]` entry). */
export function productImage(product: Product | null | undefined): string {
  if (!product) return ""
  const thumb = typeof product.thumbnail === "string" ? product.thumbnail.trim() : ""
  if (thumb) return thumb
  const first = (product.images || [])
    .map((i) => (typeof i === "string" ? i : i?.url || ""))
    .find((u) => Boolean(u))
  return first || ""
}

/** A second image for the card hover state; `""` when the product has only one. */
export function productHoverImage(product: Product | null | undefined): string {
  const primary = productImage(product)
  const alt = (product?.images || [])
    .map((i) => (typeof i === "string" ? i : i?.url || ""))
    .find((u) => u && u !== primary)
  return alt || ""
}

/**
 * `sizes` presets. Cards render ~46vw on phones, ~22vw on tablets and 200–260px
 * on desktop; the PDP hero is ~92vw / 50vw.
 */
export const IMAGE_SIZES = {
  card: "(max-width: 749px) 46vw, (max-width: 1199px) 22vw, 220px",
  tile: "(max-width: 749px) 46vw, (max-width: 1199px) 30vw, 260px",
  hero: "(max-width: 989px) 92vw, 48vw",
  thumb: "80px",
  avatar: "64px",
} as const

/** Default srcset widths per preset — kept small on purpose (SSR sharp cost). */
export const IMAGE_WIDTHS = {
  card: [220, 400, 660],
  tile: [260, 400, 780],
  hero: [480, 720, 1080],
  thumb: [80, 160],
  avatar: [64, 128],
} as const
