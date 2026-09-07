/**
 * Buy-Now deep-link parser.
 *
 * `products/[id].astro#buyHref()` and `scripts/cart.ts#checkoutHref()` both
 * write the same `/checkout?buy=<variant>&qty=<n>&p=<usdMinor>&t=<title>&
 * h=<handle>&v=<variantTitle>&i=<thumbnail>` contract so the button works
 * without JavaScript. Checkout used to ignore the query string entirely and
 * bounce to an empty cart — this keeps the plain-anchor path alive.
 */

export interface BuyNowIntent {
  /** Medusa variant id (may be empty when the catalogue fell back). */
  variantId: string;
  /** Variant display title, e.g. "Standard". */
  variantTitle: string;
  /** Product title for the summary row. */
  title: string;
  /** Product handle for the summary row link. */
  handle: string;
  /** Product image URL for the summary row. */
  thumbnail: string;
  quantity: number;
  /** USD minor units per unit. */
  unitPrice: number;
}

/** Clamp + validate one quantity value; anything weird becomes a single unit. */
function safeQty(raw: string | null): number {
  const n = Math.floor(Number(raw || 1));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(99, n);
}

/** Decode one price value; tolerate major units the way other callers do. */
function safePrice(raw: string | null): number {
  const n = Number(raw || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1000 ? Math.round(n * 100) : Math.round(n);
}

/**
 * `parseBuyNowLink("/checkout?buy=v1&qty=2&p=3499&…")` → the intent, or `null`
 * when the link carries nothing usable. An empty variant id alone is NOT
 * enough to treat the URL as a buy-now link.
 */
export function parseBuyNowLink(search: string): BuyNowIntent | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search : `?${search}`,
  );
  const variantId = (params.get("buy") || "").trim();
  const title = (params.get("t") || "").trim();
  const handle = (params.get("h") || "").trim();
  const unitPrice = safePrice(params.get("p"));
  // Anchor clicks must land somewhere sane: require a variant id, a title,
  // or at least a price — otherwise the page boots from the real cart.
  if (!variantId && !title && !handle && unitPrice <= 0) return null;
  return {
    variantId,
    variantTitle: (params.get("v") || "").trim(),
    title: title.slice(0, 120),
    handle: handle.slice(0, 160),
    thumbnail: (params.get("i") || "").slice(0, 2000),
    quantity: safeQty(params.get("qty")),
    unitPrice,
  };
}
