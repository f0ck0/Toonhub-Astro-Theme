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

Set `MEDUSA_URL` and `MEDUSA_PUBLISHABLE_KEY` for a live catalog. Without them, chrome and content pages still render; cart falls back to the browser.
