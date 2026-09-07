/**
 * Product page behaviour: gallery, lightbox, variant/quantity selection and the
 * review form. Imported by `pages/products/[id].astro` only.
 *
 * Progressive enhancement rules used here:
 * - the lightbox is a native `<dialog>` (focus trap, Escape and `::backdrop`
 *   come free and pass WCAG without custom code);
 * - variant buttons mirror their state into the add-to-cart / buy-now triggers,
 *   which are plain controls that still work if this module never arrives;
 * - the star rating is a real radio group, so keyboard and screen-reader users
 *   can rate without any JS;
 * - the review form reports through an `aria-live` region and disables its
 *   submit button while in flight.
 */

import { $, $$, announce, escapeHtml, ready, setOpen } from "./lib/dom"
import { config, readStorage, STORAGE_KEYS } from "./lib/config"
import { formatMoney } from "./lib/money"

/* -------------------------------------------------------------------------- */
/* Gallery                                                                    */
/* -------------------------------------------------------------------------- */

/** Swap every source of a `<picture>`/`<img>` to a new URL. */
function swapImage(container: HTMLElement | null, src: string): void {
  if (!container || !src) return
  const img = container instanceof HTMLImageElement ? container : $<HTMLImageElement>("img", container)
  if (img) {
    img.src = src
    img.removeAttribute("srcset")
  }
  $$<HTMLSourceElement>("source", container).forEach((source) => {
    source.srcset = src
  })
}

function bindGallery(): void {
  const stage = $<HTMLElement>("[data-gallery-stage]")
  const thumbs = $$<HTMLElement>("[data-gallery-thumb]")
  if (!stage || !thumbs.length) return

  const select = (thumb: HTMLElement) => {
    const src = thumb.getAttribute("data-full-src") || $<HTMLImageElement>("img", thumb)?.currentSrc || ""
    if (!src) return
    swapImage(stage, src)
    thumbs.forEach((item) => {
      const on = item === thumb
      item.classList.toggle("is-on", on)
      item.setAttribute("aria-pressed", String(on))
      item.setAttribute("aria-current", on ? "true" : "false")
    })
    const live = $<HTMLElement>("[data-gallery-live]")
    if (live) live.textContent = thumb.getAttribute("data-label") || ""
  }

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => select(thumb))
    // Arrow-key navigation across the thumbnail strip.
    thumb.addEventListener("keydown", (event) => {
      const index = thumbs.indexOf(thumb)
      const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
      if (!delta) return
      event.preventDefault()
      const next = thumbs[(index + delta + thumbs.length) % thumbs.length]
      next?.focus()
      select(next)
    })
  })

  // Zoom lightbox — native dialog.
  const dialog = $<HTMLDialogElement>("[data-lightbox]")
  const dialogImage = $<HTMLImageElement>("[data-lightbox-img]")
  if (dialog && dialogImage) {
    const open = () => {
      const current = $<HTMLImageElement>("img", stage)
      const zoom = current?.getAttribute("data-zoom-src") || current?.currentSrc || current?.src || ""
      if (!zoom) return
      dialogImage.src = zoom
      dialogImage.alt = current?.alt || "Product image, enlarged"
      if (typeof dialog.showModal === "function") dialog.showModal()
      else dialog.setAttribute("open", "")
      document.body.classList.add("drawer-open")
    }
    stage.addEventListener("click", open)
    stage.setAttribute("role", "button")
    stage.setAttribute("tabindex", "0")
    stage.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        open()
      }
    })
    dialog.addEventListener("click", (event) => {
      // Clicking the backdrop (outside the image) closes.
      if (event.target === dialog) dialog.close()
    })
    dialog.addEventListener("close", () => {
      dialogImage.removeAttribute("src")
      document.body.classList.remove("drawer-open")
      stage.focus({ preventScroll: true })
    })
    $("[data-lightbox-close]")?.addEventListener("click", () => dialog.close())
  }
}

/* -------------------------------------------------------------------------- */
/* Variants + quantity                                                        */
/* -------------------------------------------------------------------------- */

/** Every anchor that deep-links to `/checkout?buy=…` (main form + sticky bar). */
const BUY_NOW = "a[data-action='buynow']"

let selectedPriceUsd = 0
let selectedQty = 1

function qtyOf(input: HTMLInputElement | null): number {
  const raw = Number(input?.value ?? selectedQty)
  if (!Number.isFinite(raw) || raw < 1) return 1
  return Math.min(99, Math.round(raw))
}

/**
 * Keep the no-JS buy-now link honest as the shopper changes variant or
 * quantity. Parameter names match `checkoutHref()` in `scripts/cart.ts` and the
 * checkout page: `buy` = variant id, `v` = variant title, `p` = USD minor units.
 */
function syncBuyNowHref(variantId: string, variantTitle: string, qty: number, priceUsd: number): void {
  for (const anchor of $$<HTMLAnchorElement>(BUY_NOW)) {
    if (!anchor.getAttribute("href")) continue
    const url = new URL(anchor.href, window.location.origin)
    if (variantId) url.searchParams.set("buy", variantId)
    if (variantTitle) url.searchParams.set("v", variantTitle)
    url.searchParams.set("qty", String(Math.max(1, qty)))
    if (priceUsd > 0) url.searchParams.set("p", String(priceUsd))
    anchor.href = url.toString()
  }
}

/** Mirror the selected variant's price into every price slot on the page. */
function writePrice(priceUsd: number): void {
  if (!(priceUsd > 0)) return
  // Called only after a variant is chosen, so the price is exact — the "From"
  // prefix the server rendered for an unchosen range no longer applies.
  const sale = formatMoney(priceUsd)
  // The store's standing offer is "50% off", so the compare-at price is 2×.
  const compare = formatMoney(Math.round(priceUsd * 2))
  for (const el of $$<HTMLElement>("[data-variant-price]")) el.textContent = sale
  for (const el of $$<HTMLElement>("[data-variant-compare]")) {
    el.textContent = compare
    el.hidden = false
  }
  for (const el of $$<HTMLElement>("[data-price]")) el.textContent = sale
}

function bindOptions(): void {
  const row = $<HTMLElement>("[data-variant-row]")
  const qtyRow = $<HTMLElement>("[data-pdp-qty-row]")
  const qtyInput = $<HTMLInputElement>("[data-pdp-qty]")
  const triggers = $$<HTMLElement>("[data-variant-target]")

  const firstTrigger = triggers[0]
  selectedPriceUsd = Number(firstTrigger?.dataset.price || 0) || 0
  selectedQty = qtyOf(qtyInput)

  function activeChip(): HTMLElement | null {
    if (!row) return null
    return (
      $<HTMLElement>("[data-variant][aria-pressed='true']", row) ||
      $<HTMLElement>("[data-variant]", row)
    )
  }

  /** Push a chip's state into the add-to-cart / buy-now triggers. */
  function writeVariant(button: HTMLElement): void {
    const variantId = button.dataset.variant || ""
    const variantTitle = button.dataset.vtitle || ""
    const priceUsd = Number(button.dataset.vprice || 0) || 0

    for (const trigger of triggers) {
      if (variantId) trigger.dataset.variantId = variantId
      if (variantTitle) trigger.dataset.vtitle = variantTitle
      if (priceUsd > 0) trigger.dataset.price = String(priceUsd)
      trigger.dataset.qty = String(selectedQty)
    }

    if (priceUsd > 0) selectedPriceUsd = priceUsd
    writePrice(selectedPriceUsd)
    syncBuyNowHref(variantId, variantTitle, selectedQty, selectedPriceUsd)
    announce(`${variantTitle || "Option"} selected.`)
  }

  if (row) {
    row.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-variant]")
      if (!button || button.disabled) return
      $$<HTMLButtonElement>("[data-variant]", row).forEach((item) => {
        const on = item === button
        item.classList.toggle("is-on", on)
        item.setAttribute("aria-pressed", String(on))
      })
      writeVariant(button)
      const optionLabel = $<HTMLElement>("[data-selected-option]")
      if (optionLabel) optionLabel.textContent = button.dataset.vtitle || ""
    })

    // Chips are buttons, but keep Enter/Space obvious for assistive tech.
    row.addEventListener("keydown", (event) => {
      const key = (event as KeyboardEvent).key
      if (key !== "ArrowRight" && key !== "ArrowLeft") return
      const chips = $$<HTMLButtonElement>("[data-variant]", row)
      const index = chips.findIndex((chip) => chip === document.activeElement)
      if (index < 0) return
      event.preventDefault()
      const delta = key === "ArrowRight" ? 1 : -1
      const next = chips[(index + delta + chips.length) % chips.length]
      next?.focus()
      next?.click()
    })
  }

  if (qtyRow && qtyInput) {
    // `applyQty` is a hoisted declaration, so re-bind the narrowed nodes.
    const row: HTMLElement = qtyRow
    const input: HTMLInputElement = qtyInput
    const max = Number(row.getAttribute("data-max")) || 99

    function applyQty(next: number): void {
      selectedQty = Math.max(1, Math.min(max, Math.round(next) || 1))
      input.value = String(selectedQty)
      for (const trigger of triggers) trigger.dataset.qty = String(selectedQty)
      const decrease = $<HTMLButtonElement>("[data-pdp-qty-step='-1']", row)
      const increase = $<HTMLButtonElement>("[data-pdp-qty-step='1']", row)
      if (decrease) decrease.disabled = selectedQty <= 1
      if (increase) increase.disabled = selectedQty >= max
      const chip = activeChip()
      syncBuyNowHref(
        chip?.dataset.variant || "",
        chip?.dataset.vtitle || "",
        selectedQty,
        selectedPriceUsd,
      )
    }

    qtyRow.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>("[data-pdp-qty-step]")
      if (!button || button.hasAttribute("disabled")) return
      applyQty(selectedQty + Number(button.getAttribute("data-pdp-qty-step") || 0))
    })

    // Typing a number must clamp + re-sync the buy link too.
    qtyInput.addEventListener("change", () => applyQty(Number(qtyInput.value)))
    qtyInput.addEventListener("input", () => applyQty(Number(qtyInput.value)))

    applyQty(selectedQty)
  }
}

/* -------------------------------------------------------------------------- */
/* Reviews form                                                               */
/* -------------------------------------------------------------------------- */

const MAX_PHOTOS = 5
const MAX_PHOTO_BYTES = 2_000_000

function filesToDataUrls(files: FileList | null): Promise<string[]> {
  if (!files?.length) return Promise.resolve([])
  const usable = Array.from(files)
    .filter((file) => file.type.startsWith("image/") && file.size <= MAX_PHOTO_BYTES)
    .slice(0, MAX_PHOTOS)
  return Promise.all(
    usable.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ""))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        }),
    ),
  )
}

function bindReviewForm(): void {
  const form = $<HTMLFormElement>("[data-review-form]")
  if (!form) return

  const submit = $<HTMLButtonElement>("[data-review-submit]", form)
  const error = $<HTMLElement>("[data-review-error]", form)
  const preview = $<HTMLElement>("[data-review-preview]", form)
  const fileInput = $<HTMLInputElement>("[data-review-images]", form)

  const fail = (message: string) => {
    if (!error) return
    error.hidden = false
    error.textContent = message
  }
  const clearError = () => {
    if (!error) return
    error.hidden = true
    error.textContent = ""
  }

  fileInput?.addEventListener("change", async () => {
    if (!preview) return
    const urls = await filesToDataUrls(fileInput.files)
    preview.innerHTML = urls
      .map((url) => `<img src="${url}" alt="Review photo preview" width="80" height="80" />`)
      .join("")
    preview.hidden = urls.length === 0
    const note = $<HTMLElement>("[data-review-photo-note]", form)
    if (note) note.textContent = `${urls.length} of ${MAX_PHOTOS} photos attached`
  })

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    clearError()

    const data = new FormData(form)
    const content = String(data.get("content") || "").trim()
    const rating = Number(data.get("rating") || 5)
    if (!content) {
      fail("Please write a review first.")
      $<HTMLTextAreaElement>("[name='content']", form)?.focus()
      return
    }

    if (submit) {
      submit.disabled = true
      submit.setAttribute("aria-busy", "true")
      submit.dataset.label = submit.textContent || ""
      submit.textContent = "Sending…"
    }

    try {
      const images = await filesToDataUrls(fileInput?.files || null)
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.getAttribute("data-product-id") || "",
          rating,
          content,
          name: String(data.get("name") || "").trim(),
          title: String(data.get("title") || "").trim(),
          images,
        }),
        signal: AbortSignal.timeout(15000),
      })
      const payload = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        fail(payload.error || "Failed to submit. Please try again.")
        return
      }
      form.reset()
      if (preview) {
        preview.innerHTML = ""
        preview.hidden = true
      }
      const note = $<HTMLElement>("[data-review-photo-note]", form)
      if (note) note.textContent = ""
      announce("Thanks — your review was submitted.")
      const success = $<HTMLElement>("[data-review-success]", form)
      if (success) {
        success.hidden = false
        window.setTimeout(() => {
          success.hidden = true
        }, 6000)
      }
      // Ask the reviews module to refetch the list.
      const reload = (window as unknown as { toonhubLoadReviews?: () => void }).toonhubLoadReviews
      if (typeof reload === "function") reload()
    } catch {
      fail("Network error. Please try again.")
    } finally {
      if (submit) {
        submit.disabled = false
        submit.removeAttribute("aria-busy")
        submit.textContent = submit.dataset.label || "Submit review"
      }
    }
  })
}

/* -------------------------------------------------------------------------- */
/* Sticky buy bar                                                             */
/* -------------------------------------------------------------------------- */

function bindStickyBar(): void {
  const bar = $<HTMLElement>("[data-pdp-sticky]")
  const buyRow = $<HTMLElement>("[data-pdp-buy]")
  if (!bar || !buyRow) return

  const observer = new IntersectionObserver(
    ([entry]) => {
      // Show the sticky bar only once the real CTA has scrolled away.
      bar.classList.toggle("is-visible", !entry.isIntersecting && entry.boundingClientRect.top < 0)
    },
    { threshold: 0 },
  )
  observer.observe(buyRow)
}

/* -------------------------------------------------------------------------- */

function init(): void {
  bindGallery()
  bindOptions()
  bindReviewForm()
  bindStickyBar()

  // Keep the wishlist button in sync with locally saved items.
  const saved = readStorage<{ id?: string }[]>(STORAGE_KEYS.wishlist, [])
  const productId = $<HTMLElement>("[data-pdp-product]")?.getAttribute("data-pdp-product") || ""
  const button = $<HTMLElement>("[data-wish]")
  if (button && productId && saved.some((entry) => entry?.id === productId)) {
    button.classList.add("is-on")
    button.setAttribute("aria-pressed", "true")
  }

  // Surface a friendly note when the backend is not configured.
  if (!config().publishableKey) {
    const note = $<HTMLElement>("[data-medusa-warning]")
    if (note) note.hidden = false
  }

  // Announce gallery changes politely.
  const live = $<HTMLElement>("[data-gallery-live]")
  if (live) live.setAttribute("aria-live", "polite")

  // Ensure dialogs close on scroll-lock cleanup.
  window.addEventListener("pagehide", () => setOpen("quickView", false), { once: true })

  // Expose helpers used by the review list module.
  Object.assign(window, { toonhubPdp: { swapImage, escapeHtml } })
}

ready(init)
