# Toonhub Astro Theme

Storefront for **TOONHUB** — a black Shopify-Dawn-style anime figures shop. Frontend design, page structure and shopping features follow [tsukiyashop.com](https://tsukiyashop.com/) (assets are original / catalog-driven, not copied).

## What’s included

- Sticky header: rotating announcement, centered logo, currency, predictive search overlay, account, cart drawer
- Nav: Home · Track Order · Shop All (Medusa category list) · Anime List (A–Z one-column dropdown of those categories)
- Home: Shop by List, clearance countdown, benefits marquee, review strip (live Medusa counts/stars when reviews exist), new-arrivals slider, more collections, SEO block, newsletter
- Collection grids with sort + infinite scroll (a category only lists that category’s products)
- Product pages: gallery + lightbox, sale pricing, quantity, variants, add-to-cart drawer, Medusa reviews (stars, text, photos), related products
- Cart drawer + cart page with Buy-1-Get-2nd-50% off, terms checkbox
- Shopify-style checkout: right-hand order summary; left express pay → address → PayPal/Stripe → confirm
- Policies, about, contact, care guide, affiliate, track order, blog, 404
- Medusa.js catalog, cart, checkout, reviews, newsletter, and contact APIs (localStorage cart fallback when Medusa is down)

## Architecture

Pure `.astro` components + vanilla TypeScript modules — **no UI framework**, so
there is no `client:*` hydration cost anywhere. Every page ships the minimum
JavaScript its own markup needs:

| Layer | Files | Notes |
| :-- | :-- | :-- |
| Document shell / SEO | `src/layouts/Base.astro` | Single source of truth for `<title>`, canonical, robots, Open Graph, Twitter, hreflang, JSON-LD, font + LCP preloads and the `#toonhub-config` data island. Pages pass *data* (`SeoMeta`), never tags. |
| Shared primitives | `src/components/{Media,Skeleton,EmptyState,Breadcrumb,SectionHeading}.astro` | `Media` is the only way a bitmap is rendered (`alt`/`width`/`height` are required props); `Skeleton` and `EmptyState` are the only "no data" UI. |
| Storefront components | `Header`, `Footer`, `CartDrawer`, `SearchOverlay`, `QuickView`, `ProductCard`, `CollectionCard`, `Stars`, `ReviewMedals`, `TrustIcons`, `PolicyLayout` | All typed `Props` interfaces with defaults, all copy via `useTranslations()`. |
| Data access | `src/lib/{medusa,medusa-config,fallback,images,site,currency,seo}.ts` | Server-side only. Getters never throw: a dead backend degrades to the bundled demo catalogue (`DEMO_CATALOG=off` disables that) instead of returning a 500. |
| Types | `src/types.ts` | Domain + `SeoMeta`; no `any` in components or libs. |
| i18n | `src/i18n/ui.ts`, `src/lib/i18n.ts` | `en` / `zh-Hant` / `ja`. `UiKey` is derived from the English table, so a missing translation is a type error. Locale is negotiated per request — see below. |
| Client behaviour | `src/scripts/` | `ui.ts` (global chrome) plus one module per surface: `cart`, `search`, `search-page`, `quick-view`, `pdp`, `catalog`, `reviews`, `wishlist`, `contact`, `track-order`, sharing `lib/{dom,money,config}.ts` and `medusa-client.ts`. |

### Images

| Source | Strategy |
| :-- | :-- |
| `src/assets/**` (bundled artwork) | Imported → emitted as the pre-built hashed WebP. `optimizeAsset` opts a call site into `<Picture>` + AVIF/WebP srcset (worth it when prerendering or behind an image CDN — in SSR, Astro's `/_image` re-encodes per request). |
| Medusa CDN | `<img>` with explicit `width`/`height`, never re-encoded here. `MEDIA_REMOTE_OPTIMIZE=true` routes them through `astro:assets` (needs `image.remotePatterns`). |
| `public/**` | The theme's own sharp endpoint: `/img/w{size}/{path}?fmt=avif`. |

Above-the-fold images get `priority` (eager + `fetchpriority="high"`) and the
first tile is preloaded as the LCP candidate; everything else is lazy. Every
image slot reserves space with `aspect-ratio` + intrinsic dimensions, so there
is no layout shift.

### Language

The locale is negotiated **per visitor, not per URL** — one canonical URL per
page, no `/ja/…` duplicates:

```
toonhub_locale cookie  →  Accept-Language (q-values honoured)  →  en
```

`src/middleware.ts` resolves it once per request onto `Astro.locals.locale`, and
everything reads it through `pageLocale(Astro)` (never `Astro.currentLocale`
directly — with `output: "server"` and no `src/pages/[locale]/` folders that is
always `en`). HTML responses carry `Vary: Accept-Language`.

The footer switcher is three plain links to `/api/locale?set=<locale>&next=<path>`,
so changing language works with JavaScript disabled. That endpoint validates
`next` and only ever redirects to a same-origin path.

Hand-written prose (policies, about, care guide, affiliate, account, checkout)
is English-only, so those documents declare `<html lang="en">` while the
translated chrome around them declares its own `lang` on `<header>`, `<footer>`
and each overlay — WCAG 3.1.1 *and* 3.1.2. Localized URLs would need real
`src/pages/ja/` + `src/pages/zh-Hant/` route folders, prefixed internal links
and hreflang alternates; see the note in `src/lib/i18n.ts` before attempting it.

### Resilience & a11y conventions

- **Empty / loading**: server renders `Skeleton`; `catalog.ts` either fills real
  cards from the browser or swaps in `EmptyState` with the reason and a way
  forward. Unknown product/collection handles return a real **404**.
- **State, not structure**: client scripts only toggle state through `data-*`
  hooks (`data-cart-*`, `data-gallery-*`, `data-variant*`, `data-load-more*`,
  `data-review*`, …), so every page still works with JavaScript disabled —
  including "Buy now", which is a real `/checkout?buy=…&qty=…&v=…` link.
- **Focus & motion**: visible `:focus-visible` rings, `prefers-reduced-motion`
  (plus `html.no-motion`) honoured everywhere, 44 px minimum touch targets,
  `aria-live` regions for cart/search/pagination/tracking results.
- **Overflow**: titles truncate, blurbs clamp (`.truncate`, `.line-clamp`).

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Dev server (port 8888, all hosts allowed)   |
| `npm run build`   | Production build                            |
| `npm run preview` | Preview the build                           |

Copy `.env.example` to `.env`. Defaults:

```
MEDUSA_URL=https://medusa.toonhubshop.com
MEDUSA_PUBLISHABLE_KEY=pk_...
```

Store API: `https://medusa.toonhubshop.com`. Medusa v2 **requires** `MEDUSA_PUBLISHABLE_KEY` (Admin → Settings → Publishable API Keys, linked to a sales channel). Without that header, `/store/products` and `/store/product-categories` return `Publishable API key required`, and category pages stay empty.

Anime List / Shop All are Medusa product categories. Opening a category loads that category’s products (`category_id`, including child categories).
