/**
 * `/wishlist` — renders the device-local saved list.
 *
 * The wishlist lives in `localStorage` (written by `scripts/cart.ts`), so the
 * server cannot know its contents: the page ships an empty-state block and this
 * module fills the grid. It re-renders on the `toonhub:wishlist` event, which
 * cart.ts dispatches after every add/remove, so heart buttons on this page
 * update the grid without a reload.
 */

import { $, escapeHtml, escapePath, ready } from "./lib/dom"
import { STORAGE_KEYS, readStorage } from "./lib/config"
import { formatMoney } from "./lib/money"
import type { WishlistItem } from "../types"

function readWishlist(): WishlistItem[] {
  const raw = readStorage<WishlistItem[]>(STORAGE_KEYS.wishlist, [])
  return Array.isArray(raw) ? raw.filter((entry) => entry && entry.id) : []
}

function cardTemplate(item: WishlistItem): string {
  const href = `/products/${escapePath(item.handle || item.id)}`
  const title = escapeHtml(item.title || "Saved figure")
  const image = item.thumbnail
    ? `<img class="pc-media__img" src="${escapeHtml(item.thumbnail)}" alt="${title}" width="600" height="600" loading="lazy" decoding="async" />`
    : `<span class="pc-media__img media--empty" aria-hidden="true"></span>`
  const price = item.unit_price
    ? `<span class="pc-price">${escapeHtml(formatMoney(Number(item.unit_price)))}</span>`
    : `<span class="pc-price pc-price--unavailable">Price unavailable</span>`

  return `<article class="product-card card" data-product-id="${escapeHtml(item.id)}">
    <div class="pc-media">
      <a class="pc-media__link" href="${href}" aria-label="${title}">${image}</a>
      <button class="wish-btn is-on" type="button" data-wish data-wish-id="${escapeHtml(item.id)}"
        data-wish-handle="${escapeHtml(item.handle || "")}" data-wish-title="${title}"
        data-wish-img="${escapeHtml(item.thumbnail || "")}" data-wish-price="${Number(item.unit_price || 0)}"
        aria-pressed="true" aria-label="Remove from wishlist">
        <span data-wish-glyph aria-hidden="true">♥</span>
      </button>
    </div>
    <a class="pc-info" href="${href}" tabindex="-1" aria-hidden="true">
      <h3 class="pc-title truncate">${title}</h3>
      <p class="pc-price-row">${price}</p>
    </a>
    <a class="pc-cta link-btn" href="${href}">View product</a>
  </article>`
}

export function renderWishlist(): void {
  const grid = $<HTMLElement>("[data-wishlist-grid]")
  const empty = $<HTMLElement>("[data-wishlist-empty]")
  const count = $<HTMLElement>("[data-wishlist-count]")
  if (!grid) return

  const items = readWishlist()
  grid.innerHTML = items.map(cardTemplate).join("")
  if (count) {
    count.textContent = String(items.length)
    count.hidden = items.length === 0
  }
  if (empty) empty.hidden = items.length > 0
}

function init(): void {
  if (!$("[data-wishlist-grid]")) return
  renderWishlist()
  document.addEventListener("toonhub:wishlist", () => renderWishlist())
  // A card's own heart button toggles the item; cart.ts dispatches the event,
  // this re-render is the response. Nothing else to bind.
}

ready(init)
