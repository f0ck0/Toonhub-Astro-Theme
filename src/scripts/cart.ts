/**
 * Cart runtime — state, drawer/page rendering, badges, wishlist and buy-now.
 *
 * Imported by `<CartDrawer />`, so it ships exactly on the pages that render a
 * cart surface. Rendering is *declarative*: any element carrying one of the
 * `data-cart-*` hooks is kept in sync, which lets the drawer, the full cart
 * page and the sticky bar share one implementation instead of three copies.
 *
 * Medusa is the source of truth when reachable; `localStorage` is the fallback
 * so a shopper never loses a line item to a backend hiccup.
 */

import {
  $,
  $$,
  announce,
  escapeHtml,
  escapePath,
  ready,
  setOpen,
  toggleHidden,
} from "./lib/dom";
import {
  config,
  STORAGE_KEYS,
  readStorage,
  writeStorage,
  removeStorage,
} from "./lib/config";
import {
  bogoDiscount,
  formatMoney,
  getCurrency,
  subtotalOf,
  toMinorUnits,
  unitCount,
} from "./lib/money";
import type {
  AddToCartPayload,
  CartItem,
  QuickViewData,
  WishlistItem,
} from "../types";

const LINE_LIMIT = 100;

let items: CartItem[] = [];
let adding = false;

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

function readLocal(): CartItem[] {
  const raw = readStorage<CartItem[]>(STORAGE_KEYS.localCart, []);
  return Array.isArray(raw) ? raw.filter(isValidLine) : [];
}

function isValidLine(item: unknown): item is CartItem {
  const line = item as CartItem;
  return Boolean(
    line && typeof line === "object" && (line.title || line.variant_id),
  );
}

function writeLocal(next: CartItem[]): void {
  writeStorage(STORAGE_KEYS.localCart, next);
}

function getCartId(): string {
  return readStorage<string>(STORAGE_KEYS.cartId, "") || "";
}

function addLocal(payload: AddToCartPayload): void {
  const local = readLocal();
  const quantity = Math.max(1, Math.floor(Number(payload.quantity) || 1));
  const existing = local.find(
    (line) => line.variant_id && line.variant_id === payload.variantId,
  );
  if (existing) {
    existing.quantity += quantity;
    existing.title = payload.title || existing.title;
  } else {
    local.push({
      id: `${payload.variantId || "item"}-${Date.now()}`,
      title: payload.title || "Figure",
      thumbnail: payload.thumbnail,
      variant_id: payload.variantId,
      quantity,
      unit_price: toMinorUnits(payload.unit_price),
      handle: payload.handle,
      variant_title: payload.variant_title,
    });
  }
  writeLocal(local);
  items = local;
}

/* -------------------------------------------------------------------------- */
/* Medusa sync                                                                */
/* -------------------------------------------------------------------------- */

async function fetchRemote(): Promise<CartItem[] | null> {
  const cartId = getCartId();
  if (!cartId) return null;
  try {
    const res = await fetch(`/api/cart?cartId=${encodeURIComponent(cartId)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: CartItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return null;
  }
}

async function refresh(): Promise<void> {
  const remote = await fetchRemote();
  const local = readLocal();
  // Remote wins when it has lines; otherwise keep the offline cart.
  items = remote && (remote.length || !local.length) ? remote : local;
  render();
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

function lineTemplate(item: CartItem): string {
  const currency = getCurrency();
  const href = item.handle ? `/products/${escapePath(item.handle)}` : "";
  const title = escapeHtml(item.title || "Figure");
  const media = item.thumbnail
    ? `<img class="cart-line__img" src="${escapeHtml(item.thumbnail)}" alt="" width="88" height="88" loading="lazy" decoding="async" />`
    : `<span class="cart-line__img cart-line__img--placeholder" aria-hidden="true"></span>`;
  const lineTotal = formatMoney(
    (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
    currency,
  );

  return `<li class="cart-line" data-line-id="${escapeHtml(item.id)}">
    ${href ? `<a class="cart-line__media" href="${href}" tabindex="-1" aria-hidden="true">${media}</a>` : `<span class="cart-line__media">${media}</span>`}
    <div class="cart-line__body">
      ${href ? `<a class="cart-line__title truncate" href="${href}">${title}</a>` : `<p class="cart-line__title truncate">${title}</p>`}
      ${item.variant_title ? `<p class="cart-line__variant truncate">${escapeHtml(item.variant_title)}</p>` : ""}
      <div class="cart-line__controls">
        <div class="qty-row" role="group" aria-label="Quantity for ${title}">
          <button type="button" data-qty="-1" data-id="${escapeHtml(item.id)}" aria-label="Decrease quantity">&minus;</button>
          <span class="qty-row__value" aria-live="off">${Number(item.quantity) || 0}</span>
          <button type="button" data-qty="1" data-id="${escapeHtml(item.id)}" aria-label="Increase quantity">+</button>
        </div>
        <p class="cart-line__price">${lineTotal}</p>
      </div>
      <button type="button" class="link-btn cart-line__remove" data-remove="${escapeHtml(item.id)}">Remove</button>
    </div>
  </li>`;
}

function skeletonTemplate(count = 2): string {
  return Array.from({ length: count })
    .map(
      () => `<li class="cart-line" aria-hidden="true">
        <span class="cart-line__img skeleton-media shimmer"></span>
        <div class="cart-line__body">
          <span class="skeleton-line shimmer" style="width:70%;"></span>
          <span class="skeleton-line shimmer" style="width:40%;"></span>
        </div>
      </li>`,
    )
    .join("");
}

function renderLists(): void {
  for (const list of $$<HTMLElement>("[data-cart-lines]")) {
    if (list.dataset.cartState === "loading") {
      list.innerHTML = skeletonTemplate();
      continue;
    }
    list.innerHTML = items.length ? items.map(lineTemplate).join("") : "";
  }
}

function renderTotals(): void {
  const currency = getCurrency();
  const subtotal = subtotalOf(items);
  const discount = bogoDiscount(items);
  const total = Math.max(0, subtotal - discount);
  const units = unitCount(items);

  for (const el of $$<HTMLElement>("[data-cart-subtotal]"))
    el.textContent = formatMoney(subtotal, currency);
  for (const el of $$<HTMLElement>("[data-cart-total]"))
    el.textContent = formatMoney(total, currency);
  for (const el of $$<HTMLElement>("[data-cart-discount]")) {
    el.textContent = `−${formatMoney(discount, currency)}`;
  }
  for (const row of $$<HTMLElement>("[data-cart-discount-row]"))
    toggleHidden(row, discount <= 0);

  for (const badge of $$<HTMLElement>("[data-cart-count]")) {
    badge.textContent = String(units);
    badge.hidden = units === 0;
    const label = badge.closest("[data-cart-label]");
    if (label) {
      label.setAttribute(
        "aria-label",
        units ? `Cart, ${units} item${units === 1 ? "" : "s"}` : "Cart",
      );
    }
  }

  // Nudge copy: one unit → invite a second; two or more → show the saving.
  const nudgeKey = units === 1 ? "single" : discount > 0 ? "saving" : "";
  const messages = {
    single: "Add one more figure — the 2nd is 50% off.",
    saving: `You're saving ${formatMoney(discount, currency)} with Buy 1 get 2nd 50% off.`,
  } as const;
  for (const el of $$<HTMLElement>("[data-cart-nudge]")) {
    el.hidden = !nudgeKey;
    el.textContent = nudgeKey ? messages[nudgeKey] : "";
  }
}

function renderStates(): void {
  const empty = items.length === 0;
  for (const el of $$<HTMLElement>("[data-cart-empty]"))
    toggleHidden(el, !empty);
  for (const el of $$<HTMLElement>("[data-cart-filled]"))
    toggleHidden(el, empty);
  for (const el of $$<HTMLElement>("[data-cart-summary]"))
    toggleHidden(el, empty);
  for (const button of $$<HTMLButtonElement | HTMLAnchorElement>(
    "[data-cart-checkout]",
  )) {
    if (button instanceof HTMLButtonElement) button.disabled = empty;
    button.setAttribute("aria-disabled", String(empty));
    button.classList.toggle("is-disabled", empty);
  }
  syncAgreeGates();
}

/**
 * Terms-of-service consent gate on the full cart page: every summary block
 * that owns a `[data-cart-agree]` checkbox keeps its checkout CTA inert until
 * the box is ticked. The drawer's CTA is untouched (its block has no gate).
 */
function syncAgreeGates(): void {
  if (!items.length) return;
  for (const checkbox of $$<HTMLInputElement>("[data-cart-agree]")) {
    const scope =
      checkbox.closest<HTMLElement>("[data-cart-summary]") || document;
    const blocked = !checkbox.checked;
    for (const cta of $$<HTMLElement>("[data-cart-checkout]", scope)) {
      cta.classList.toggle("is-disabled", blocked);
      cta.setAttribute("aria-disabled", String(blocked));
    }
  }
}

export function render(): void {
  renderLists();
  renderTotals();
  renderStates();
  document.dispatchEvent(
    new CustomEvent("toonhub:cart-rendered", {
      detail: { count: items.length },
    }),
  );
}

/** Show the drawer, optionally in "just added" mode. */
export function openCart(added = false): void {
  const title = $<HTMLElement>("[data-cart-title]");
  const note = $<HTMLElement>("[data-cart-added-note]");
  const cta = $<HTMLElement>("[data-cart-checkout]");
  if (title)
    title.textContent = added ? "Added — checkout in 1 step" : "Your cart";
  if (note) toggleHidden(note, !added);
  cta?.classList.toggle("pulse-cta", added && items.length > 0);
  setOpen("cartDrawer", true);
  render();
  if (added)
    announce(
      `Added to cart. ${unitCount(items)} item${unitCount(items) === 1 ? "" : "s"} in cart.`,
    );
}

export function closeCart(): void {
  setOpen("cartDrawer", false);
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

async function pushToRemote(
  path: "add" | "remove" | "update",
  body: Record<string, unknown>,
): Promise<boolean> {
  const cartId = getCartId();
  if (!cartId) return false;
  try {
    const res = await fetch(`/api/cart/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId, ...body }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function addToCart(
  payload: AddToCartPayload,
  options: { goCheckout?: boolean; silent?: boolean } = {},
): Promise<void> {
  const quantity = Math.max(1, Math.floor(Number(payload.quantity) || 1));
  const normalized: AddToCartPayload = {
    ...payload,
    quantity,
    unit_price: toMinorUnits(payload.unit_price),
  };

  if (options.goCheckout) {
    addLocal(normalized);
    render();
    window.location.assign(checkoutHref(normalized));
    return;
  }

  if (adding) return;
  adding = true;
  const trigger = $<HTMLButtonElement>(
    `[data-add-spinner="${CSS.escape(normalized.variantId)}"]`,
  );
  trigger?.classList.add("is-busy");
  try {
    const synced = await pushToRemote("add", {
      variantId: normalized.variantId,
      quantity,
    });
    if (synced) {
      await refresh();
    } else {
      addLocal(normalized);
      render();
    }
    if (!options.silent) openCart(true);
  } finally {
    trigger?.classList.remove("is-busy");
    adding = false;
  }
}

export async function removeItem(lineId: string): Promise<void> {
  if (!lineId) return;
  const synced = await pushToRemote("remove", { itemId: lineId });
  if (synced) {
    await refresh();
  } else {
    const next = readLocal().filter((line) => line.id !== lineId);
    writeLocal(next);
    items = next;
    render();
  }
  announce("Item removed from cart.");
}

export async function changeQty(lineId: string, delta: number): Promise<void> {
  const line = items.find((entry) => entry.id === lineId);
  if (!line) return;
  const next = (Number(line.quantity) || 0) + delta;
  if (next <= 0) return removeItem(lineId);

  const synced = await pushToRemote("update", {
    itemId: lineId,
    quantity: next,
  });
  if (synced) {
    await refresh();
  } else {
    const local = readLocal();
    const found = local.find((entry) => entry.id === lineId);
    if (found) found.quantity = next;
    writeLocal(local);
    items = local;
    render();
  }
}

export function clearCart(): void {
  items = [];
  writeLocal([]);
  removeStorage(STORAGE_KEYS.cartId);
  render();
}

export function getItems(): CartItem[] {
  return [...items];
}

/** Buy-now deep link — works with JS disabled, enriched when JS is present. */
function checkoutHref(payload: AddToCartPayload): string {
  const params = new URLSearchParams({
    buy: String(payload.variantId || ""),
    qty: String(Math.max(1, Number(payload.quantity) || 1)),
    p: String(toMinorUnits(payload.unit_price)),
    t: String(payload.title || "").slice(0, 120),
    h: String(payload.handle || ""),
    v: String(payload.variant_title || ""),
    i: String(payload.thumbnail || ""),
  });
  return `/checkout?${params.toString()}`;
}

export function snapshotOrder(email: string) {
  const discount = bogoDiscount(items);
  const order = {
    id: `TH${Date.now().toString(36).toUpperCase()}`,
    email,
    created: new Date().toISOString(),
    items: items.map((line) => ({
      title: line.title,
      quantity: line.quantity,
      unit_price: line.unit_price,
    })),
    total: Math.max(0, subtotalOf(items) - discount),
  };
  const previous = readStorage<(typeof order)[]>(STORAGE_KEYS.orders, []);
  writeStorage(STORAGE_KEYS.orders, [order, ...previous].slice(0, 20));
  return order;
}

/* -------------------------------------------------------------------------- */
/* Wishlist                                                                   */
/* -------------------------------------------------------------------------- */

function readWishlist(): WishlistItem[] {
  const raw = readStorage<WishlistItem[]>(STORAGE_KEYS.wishlist, []);
  return Array.isArray(raw) ? raw.filter((entry) => entry && entry.id) : [];
}

function writeWishlist(next: WishlistItem[]): void {
  writeStorage(STORAGE_KEYS.wishlist, next.slice(0, LINE_LIMIT));
  syncWishlistUi();
}

export function syncWishlistUi(): void {
  const list = readWishlist();
  const ids = new Set(list.map((entry) => entry.id));

  for (const button of $$<HTMLElement>("[data-wish]")) {
    const on = ids.has(button.getAttribute("data-wish-id") || "");
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
    const glyph = $<HTMLElement>("[data-wish-glyph]", button);
    if (glyph) glyph.textContent = on ? "♥" : "♡";
    else button.textContent = on ? "♥" : "♡";
    const base =
      button.getAttribute("data-wish-label-on") || "Remove from wishlist";
    const off = button.getAttribute("data-wish-label-off") || "Add to wishlist";
    button.setAttribute("aria-label", on ? base : off);
  }

  for (const badge of $$<HTMLElement>("[data-wish-count]")) {
    badge.textContent = String(list.length);
    badge.hidden = list.length === 0;
  }

  document.dispatchEvent(
    new CustomEvent("toonhub:wishlist", { detail: { items: list } }),
  );
}

/* -------------------------------------------------------------------------- */
/* Event wiring (delegated — survives injected markup)                        */
/* -------------------------------------------------------------------------- */

function readQuickViewData(source: Element | null): QuickViewData | null {
  const raw = source?.getAttribute("data-qv");
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as QuickViewData;
  } catch {
    return null;
  }
}

function payloadFromTrigger(el: HTMLElement): AddToCartPayload {
  return {
    variantId: el.dataset.variantId || "",
    title: el.dataset.title || "Figure",
    thumbnail: el.dataset.thumbnail || "",
    handle: el.dataset.handle || "",
    unit_price: toMinorUnits(el.dataset.price),
    variant_title: el.dataset.vtitle || "",
    quantity: Math.max(1, Number(el.dataset.qty || 1) || 1),
  };
}

function bind(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    /* Terms gate — a disabled checkout CTA explains itself instead of moving. */
    const gatedCta = target.closest<HTMLElement>(
      "[data-cart-checkout][aria-disabled='true']",
    );
    if (gatedCta) {
      event.preventDefault();
      const scope = gatedCta.closest<HTMLElement>("[data-cart-summary]");
      if (scope) {
        toggleHidden($<HTMLElement>("[data-cart-agree-hint]", scope), false);
        $<HTMLInputElement>("[data-cart-agree]", scope)?.focus();
      }
      return;
    }

    /* quantity + remove inside any rendered cart line list. PDP add/buy
     * triggers also carry data-qty (the quantity to add) — scope these to
     * [data-cart-lines] so those clicks fall through to the add handlers. */
    const qty = target.closest<HTMLElement>("[data-cart-lines] [data-qty]");
    if (qty) {
      event.preventDefault();
      void changeQty(
        qty.getAttribute("data-id") || "",
        Number(qty.getAttribute("data-qty")),
      );
      return;
    }
    const remove = target.closest<HTMLElement>(
      "[data-cart-lines] [data-remove]",
    );
    if (remove) {
      event.preventDefault();
      void removeItem(remove.getAttribute("data-remove") || "");
      return;
    }

    /* wishlist toggle */
    const wish = target.closest<HTMLElement>("[data-wish]");
    if (wish) {
      event.preventDefault();
      event.stopPropagation();
      const id = wish.getAttribute("data-wish-id") || "";
      if (!id) return;
      const list = readWishlist();
      const index = list.findIndex((entry) => entry.id === id);
      if (index >= 0) list.splice(index, 1);
      else {
        list.unshift({
          id,
          handle: wish.getAttribute("data-wish-handle"),
          title: wish.getAttribute("data-wish-title"),
          thumbnail: wish.getAttribute("data-wish-img"),
          unit_price: toMinorUnits(wish.getAttribute("data-wish-price")),
        });
      }
      writeWishlist(list);
      announce(
        index >= 0
          ? "Removed from wishlist."
          : `${wish.getAttribute("data-wish-title") || "Item"} saved to wishlist.`,
      );
      return;
    }

    /* quick view / add to cart on a product card */
    const quickViewTrigger = target.closest<HTMLElement>(
      "[data-action='quickview']",
    );
    if (quickViewTrigger) {
      event.preventDefault();
      event.stopPropagation();
      const data = readQuickViewData(
        quickViewTrigger.closest("[data-qv]") || quickViewTrigger,
      );
      if (!data) return;
      const variants = data.variants || [];
      if (variants.length > 1 && config().quickView) {
        document.dispatchEvent(
          new CustomEvent("toonhub:quickview", { detail: data }),
        );
      } else {
        void addToCart({
          ...data,
          variantId: data.variantId || variants[0]?.id,
          quantity: 1,
        });
      }
      return;
    }

    const addTrigger = target.closest<HTMLElement>("[data-action='add']");
    if (addTrigger) {
      event.preventDefault();
      void addToCart(payloadFromTrigger(addTrigger));
      return;
    }

    /* buy now — anchors stay functional without JS, we just seed the cart first */
    const buyNow = target.closest<HTMLElement>("[data-action='buynow']");
    if (buyNow) {
      event.preventDefault();
      const payload = payloadFromTrigger(buyNow);
      buyNow.classList.add("is-busy");
      if (buyNow instanceof HTMLButtonElement) buyNow.disabled = true;
      buyNow.setAttribute("aria-busy", "true");
      const label =
        buyNow.getAttribute("data-busy-label") || "Going to checkout…";
      if (buyNow.textContent) buyNow.textContent = label;
      void addToCart(payload, { goCheckout: true });
      return;
    }
  });

  /* Terms checkbox unlocks the checkout CTA (and clears its hint). */
  document.addEventListener("change", (event) => {
    const checkbox = (event.target as HTMLElement).closest<HTMLInputElement>(
      "[data-cart-agree]",
    );
    if (!checkbox) return;
    if (checkbox.checked) {
      const scope =
        checkbox.closest<HTMLElement>("[data-cart-summary]") || document;
      toggleHidden($<HTMLElement>("[data-cart-agree-hint]", scope), true);
    }
    syncAgreeGates();
  });

  // Cart line lists are re-rendered wholesale, so delegate from the container.
  document.addEventListener("toonhub:catalog", syncWishlistUi);
  document.addEventListener("toonhub:cart-rendered", () => {
    /* hook for page-level side effects (e.g. sticky bar visibility) */
  });
}

/* -------------------------------------------------------------------------- */

function markLoading(): void {
  for (const list of $$<HTMLElement>("[data-cart-lines]"))
    list.dataset.cartState = "loading";
  renderLists();
}

function init(): void {
  bind();
  syncWishlistUi();
  if ($("[data-cart-lines]")) markLoading();
  void refresh().finally(() => {
    for (const list of $$<HTMLElement>("[data-cart-lines]"))
      delete list.dataset.cartState;
    render();
  });
}

ready(init);

declare global {
  interface Window {
    /** Public surface used by the checkout and account pages. */
    toonhub: {
      addToCart: typeof addToCart;
      openCart: typeof openCart;
      closeCart: typeof closeCart;
      refresh: typeof refresh;
      render: typeof render;
      snapshotOrder: typeof snapshotOrder;
      clearCart: typeof clearCart;
      getItems: typeof getItems;
      changeQty: typeof changeQty;
      removeItem: typeof removeItem;
      syncWishlistUi: typeof syncWishlistUi;
      formatMoney: typeof formatMoney;
      getCurrency: typeof getCurrency;
    };
  }
}

window.toonhub = {
  addToCart,
  openCart,
  closeCart,
  refresh,
  render,
  snapshotOrder,
  clearCart,
  getItems,
  changeQty,
  removeItem,
  syncWishlistUi,
  formatMoney,
  getCurrency,
};
