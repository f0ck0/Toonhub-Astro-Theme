/**
 * Quick view dialog.
 *
 * Rendered by `<QuickView />` only on pages that opt into the overlay
 * (`overlays.quickView`), so content pages never carry this markup or script.
 *
 * The dialog is filled from the `data-qv` payload the product card already
 * rendered — no extra request, no flash of empty content — and hands the actual
 * cart mutation to `cart.ts` so drawer and dialog can never disagree.
 */

import { $, $$, escapeHtml, ready, setOpen } from "./lib/dom"
import { addToCart } from "./cart"
import { formatMoney, toMinorUnits } from "./lib/money"
import type { QuickViewData } from "../types"

let current: QuickViewData | null = null
let quantity = 1
let selectedVariant = ""

function selectedVariantTitle(): string {
  const variants = current?.variants || []
  return variants.find((variant) => variant.id === selectedVariant)?.title || current?.variant_title || ""
}

function renderVariants(): void {
  const row = $<HTMLElement>("[data-qv-variants]")
  if (!row || !current) return
  const variants = current.variants?.length
    ? current.variants
    : [{ id: current.variantId, title: current.variant_title || "Default" }]

  selectedVariant = variants[0]?.id || ""
  row.innerHTML = variants
    .map(
      (variant, index) => `<button
        type="button"
        class="pdp-size-btn${index === 0 ? " is-on" : ""}"
        data-qv-variant="${escapeHtml(variant.id)}"
        data-qv-variant-title="${escapeHtml(variant.title)}"
        aria-pressed="${index === 0 ? "true" : "false"}"
      >${escapeHtml(variant.title)}</button>`,
    )
    .join("")
}

function renderPrice(): void {
  const price = $<HTMLElement>("[data-qv-price]")
  if (!price || !current) return
  const minor = toMinorUnits(current.unit_price)
  price.innerHTML = minor
    ? `<span class="pc-from">From</span>${escapeHtml(formatMoney(Math.round(minor / 2)))}`
    : ""
  const compare = $<HTMLElement>("[data-qv-compare]")
  if (compare) compare.textContent = minor ? formatMoney(minor) : ""
}

function syncQuantity(): void {
  const label = $<HTMLElement>("[data-qv-qty]")
  if (label) label.textContent = String(quantity)
  const decrease = $<HTMLButtonElement>("[data-qv-qty-step='-1']")
  if (decrease) decrease.disabled = quantity <= 1
}

export function showQuickView(data: QuickViewData): void {
  current = data
  quantity = 1

  const image = $<HTMLImageElement>("[data-qv-image]")
  if (image) {
    image.src = data.thumbnail || ""
    image.alt = data.title || ""
    image.hidden = !data.thumbnail
  }
  const placeholder = $<HTMLElement>("[data-qv-image-placeholder]")
  if (placeholder) placeholder.hidden = Boolean(data.thumbnail)

  const title = $<HTMLElement>("[data-qv-title]")
  if (title) title.textContent = data.title || ""

  const link = $<HTMLAnchorElement>("[data-qv-link]")
  if (link) {
    const href = data.handle ? `/products/${encodeURIComponent(data.handle)}` : ""
    link.href = href || "#"
    link.hidden = !href
    link.textContent = "View full details"
  }

  renderVariants()
  renderPrice()
  syncQuantity()

  const panel = $<HTMLElement>("[data-qv-panel]")
  panel?.setAttribute("aria-label", data.title || "Choose options")

  setOpen("quickView", true)
}

function closeQuickView(): void {
  setOpen("quickView", false)
}

function bind(): void {
  document.addEventListener("toonhub:quickview", ((event: CustomEvent<QuickViewData>) => {
    if (event.detail) showQuickView(event.detail)
  }) as EventListener)

  $<HTMLElement>("[data-qv-variants]")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-qv-variant]")
    if (!button) return
    $$<HTMLElement>("[data-qv-variant]").forEach((el) => {
      const on = el === button
      el.classList.toggle("is-on", on)
      el.setAttribute("aria-pressed", String(on))
    })
    selectedVariant = button.getAttribute("data-qv-variant") || ""
  })

  $<HTMLElement>("[data-qv-qty-row]")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-qv-qty-step]")
    if (!button) return
    quantity = Math.max(1, Math.min(99, quantity + Number(button.getAttribute("data-qv-qty-step"))))
    syncQuantity()
  })

  $<HTMLElement>("[data-qv-add]")?.addEventListener("click", () => {
    if (!current) return
    void addToCart({
      variantId: selectedVariant || current.variantId,
      title: current.title,
      thumbnail: current.thumbnail,
      handle: current.handle,
      unit_price: toMinorUnits(current.unit_price),
      variant_title: selectedVariantTitle(),
      quantity,
    })
    closeQuickView()
  })

  $<HTMLElement>("[data-qv-buy]")?.addEventListener("click", (event) => {
    if (!current) return
    const anchor = event.currentTarget as HTMLAnchorElement
    const params = new URLSearchParams({
      buy: selectedVariant || current.variantId,
      qty: String(quantity),
      p: String(toMinorUnits(current.unit_price)),
      t: String(current.title || "").slice(0, 120),
      h: String(current.handle || ""),
      v: selectedVariantTitle(),
      i: String(current.thumbnail || ""),
    })
    // Keep the href honest so the anchor still works if JS is mid-flight.
    anchor.setAttribute("href", `/checkout?${params.toString()}`)
    event.preventDefault()
    void addToCart(
      {
        variantId: selectedVariant || current.variantId,
        title: current.title,
        thumbnail: current.thumbnail,
        handle: current.handle,
        unit_price: toMinorUnits(current.unit_price),
        variant_title: selectedVariantTitle(),
        quantity,
      },
      { goCheckout: true },
    )
  })

  $("[data-close-qv]")?.addEventListener("click", closeQuickView)
}

ready(bind)
