## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Quality gates

Before considering any change done, run all three (CI runs them too):

- `npm run check` — `astro check` must stay at **0 errors / 0 warnings / 0 hints**
- `npm run test` — Vitest suite in `tests/` covering the pure lib layer
  (i18n negotiation, currency, regions, seo/sitemap builders, tracking,
  redirect guard). Add tests next to the feature when touching that layer.
- `npm run build` — must compile without needing Medusa credentials

Conventions to preserve: no `any` in API routes or client scripts (Medusa
payloads are typed in `src/types.ts`), UI copy only via `useTranslations()`
(never hard-code a user-facing string in a page/component; client scripts get
strings through `data-*-messages` attributes), noindex surfaces never appear in
`src/lib/sitemap.ts`'s static list.

## Data contracts worth knowing

- **Buy Now deep link** — `products/[id].astro` renders the Buy Now as a
  real anchor to `/checkout?buy=<variantId>&qty=&p=&t=&h=&v=&i=` (works with
  JS off). `checkout.ts` boots a detached one-line cart from it (`cartId=""`
  — never touches the stored bag/remote cart). Parser: `scripts/lib/buy-now.ts`.
- **Click delegation scoping** — PDP add/buy triggers carry `data-qty`; the
  delegated cart-click handler only treats `[data-cart-lines] [data-qty]` as
  quantity steps. Widening that selector breaks the PDP buttons again (there
  is a regression test in `tests/cart-flow.test.ts`).
- **Cart terms gate** — the cart page unlocks `data-cart-checkout` behind the
  `data-cart-agree` checkbox (`aria-disabled` + hint), page scope only.
- **Review data** — `src/lib/reviews.ts#fetchReviews` probes review plugins
  in order: global `/store/product-reviews` → `/store/reviews`; per-product
  `product-reviews?product_id=` → `/store/products/:id/reviews` (official
  convention) → `reviews?product_id=`. Homepage marquees (`ReviewMarquees`)
  render only when real reviews exist; empty data hides the whole section.
  The store-wide rating strip (`ReviewMedals`) is slotted into the marquee
  heading via `slot="under-heading"` and shares the *same* global fetch —
  `summarizeReviews()` derives both totals so the strip and the cards can never
  quote different numbers. It only renders standalone when there are no
  marquees, because `scripts/reviews.ts` hydrates the first
  `[data-hydrate-reviews]` it finds and a second one would stay empty forever.
- **Image `sizes`** — `IMAGE_SIZES`/`IMAGE_WIDTHS` (`src/lib/images.ts`)
  transcribe the real grid geometry from `global.css`; understating a slot makes
  the browser upscale a small variant (the cause of the blurry collection grid).
  `scripts/catalog.ts` duplicates those literals on purpose — it cannot import
  `lib/images.ts` without pulling `astro:assets` into the browser bundle — and
  `tests/image-geometry.test.ts` keeps the two in sync.
- **Language** — currency choice + `Accept-Language` decide the locale; no
  separate language switcher exists anywhere on purpose.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
