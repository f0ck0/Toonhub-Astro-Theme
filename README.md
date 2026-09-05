# Toonhub Astro Theme

Storefront for **TOONHUB** — a black Shopify-Dawn-style anime figures shop. Frontend design, page structure and shopping features follow [tsukiyashop.com](https://tsukiyashop.com/) (assets are original / catalog-driven, not copied).

## What’s included

- Sticky header: rotating announcement, centered logo, currency, predictive search overlay, account, cart drawer
- Nav: Home · Track Order · Shop All (Medusa category list) · Anime List (A–Z one-column dropdown of those categories)
- Home: Shop by List, clearance countdown, benefits marquee, review strip, new-arrivals slider, more collections, SEO block, newsletter
- Collection grids with sort + infinite scroll (a category only lists that category’s products)
- Product pages: gallery + lightbox, sale pricing, quantity, variants, add-to-cart drawer, Medusa reviews (stars, text, photos), related products
- Cart drawer + cart page with Buy-1-Get-2nd-50% off, terms checkbox
- Shopify-style checkout: right-hand order summary; left express pay → address → PayPal/Stripe → confirm
- Policies, about, contact, care guide, affiliate, track order, blog, 404
- Medusa.js catalog, cart, checkout, reviews, newsletter, and contact APIs (localStorage cart fallback when Medusa is down)

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Dev server (port 8888, all hosts allowed)   |
| `npm run build`   | Production build                            |
| `npm run preview` | Preview the build                           |

Copy `.env.example` to `.env`. Defaults:

```
MEDUSA_URL=http://96.47.238.191:9000
MEDUSA_PUBLISHABLE_KEY=pk_...
```

The Store API is on **port 9000** (`/health` → `OK`). `http://96.47.238.191/` is nginx and does not proxy `/store`. Medusa v2 **requires** `MEDUSA_PUBLISHABLE_KEY` (Admin → Settings → Publishable API Keys, linked to a sales channel). Without that header, `/store/products` and `/store/product-categories` return `Publishable API key required`, and category pages stay empty.

Anime List / Shop All are Medusa product categories. Opening a category loads that category’s products (`category_id`, including child categories).
