/**
 * Global chrome behaviour.
 *
 * Loaded once from `Base.astro` and deliberately small: it only handles UI that
 * exists on every page (drawers, menus, announcement rotator, countdown,
 * sliders). Feature logic lives next to the component that renders its markup —
 * `cart.ts` with `<CartDrawer />`, `search.ts` with `<SearchOverlay />`,
 * `quick-view.ts` with `<QuickView />`, `catalog.ts` / `reviews.ts` / `pdp.ts`
 * with the pages that need them. A policy page therefore never parses the
 * catalogue hydrator.
 *
 * Everything is bound through delegation on `document`, so markup injected
 * later (infinite scroll, quick view contents) keeps working.
 */

import { SALE_WINDOW_DAYS, SITE } from "../lib/site"
import { setCurrencyCookie } from "../lib/currency"
import {
  $,
  $$,
  closeTopOverlay,
  lockBody,
  prefersReducedMotion,
  ready,
  setOpen,
} from "./lib/dom"
import { STORAGE_KEYS, readStorage, writeStorage } from "./lib/config"

/* -------------------------------------------------------------------------- */
/* Overlay wiring                                                             */
/* -------------------------------------------------------------------------- */

interface OverlayBinding {
  open: string
  close: string
  id: string
  backdrop?: string
}

const OVERLAYS: OverlayBinding[] = [
  { open: "[data-open-cart]", close: "[data-close-cart]", id: "cartDrawer", backdrop: "cartOverlay" },
  { open: "[data-open-search]", close: "[data-close-search]", id: "searchModal" },
  { open: "[data-open-nav]", close: "[data-close-nav]", id: "mobileNav", backdrop: "navOverlay" },
  { open: "[data-open-qv]", close: "[data-close-qv]", id: "quickView" },
]

function bindOverlays(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null
    if (!target) return

    for (const overlay of OVERLAYS) {
      const opener = target.closest(overlay.open)
      if (opener) {
        // Anchors keep working without JS; only intercept real buttons.
        if (opener instanceof HTMLAnchorElement && opener.getAttribute("href")) return
        event.preventDefault()
        setOpen(overlay.id, true)
        return
      }
      if (target.closest(overlay.close)) {
        event.preventDefault()
        setOpen(overlay.id, false)
        return
      }
    }

    // Backdrop click closes the panel it belongs to.
    for (const overlay of OVERLAYS) {
      if (!overlay.backdrop) continue
      if (target.id === overlay.backdrop) {
        setOpen(overlay.id, false)
        return
      }
    }

    // Clicking the dimmed area *outside* a centred dialog closes it.
    const dialog = target.closest<HTMLElement>(".qv")
    if (dialog && event.target === dialog) setOpen("quickView", false)
  })

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return
    if (closeTopOverlay()) event.preventDefault()
  })
}

/* -------------------------------------------------------------------------- */
/* Currency + locale menu                                                     */
/* -------------------------------------------------------------------------- */

function bindCurrencyMenus(): void {
  const menus = $$<HTMLElement>("[data-currency-menu]")
  if (!menus.length) return

  const closeAll = (except?: HTMLElement) => {
    for (const menu of menus) {
      if (menu === except) continue
      menu.classList.remove("open")
      const trigger = $<HTMLElement>(`[data-currency-toggle="${menu.id}"]`)
      trigger?.setAttribute("aria-expanded", "false")
    }
  }

  for (const menu of menus) {
    const trigger = $<HTMLElement>(`[data-currency-toggle="${menu.id}"]`)
    trigger?.addEventListener("click", (event) => {
      event.stopPropagation()
      const willOpen = !menu.classList.contains("open")
      closeAll(menu)
      menu.classList.toggle("open", willOpen)
      trigger.setAttribute("aria-expanded", String(willOpen))
      if (willOpen) $<HTMLElement>("[data-currency]", menu)?.focus()
    })

    menu.addEventListener("click", (event) => {
      const option = (event.target as HTMLElement).closest<HTMLElement>("[data-currency]")
      if (!option) return
      const code = option.dataset.currency || ""
      if (!code) return
      $$<HTMLElement>("[data-currency-active]", menu).forEach((el) => {
        el.setAttribute("aria-selected", String(el === option))
      })
      setCurrencyCookie(code)
      // Currency affects SSR prices — a reload is the only honest refresh.
      window.location.reload()
    })

    // Roving keyboard support for the listbox.
    menu.addEventListener("keydown", (event) => {
      const options = $$<HTMLElement>("[data-currency]", menu)
      const index = options.indexOf(document.activeElement as HTMLElement)
      if (index < 0) return
      if (event.key === "ArrowDown") {
        event.preventDefault()
        options[(index + 1) % options.length]?.focus()
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        options[(index - 1 + options.length) % options.length]?.focus()
      } else if (event.key === "Escape") {
        event.preventDefault()
        closeAll()
        trigger?.focus()
      }
    })
  }

  document.addEventListener("click", (event) => {
    const inside = menus.some((menu) => menu.contains(event.target as Node))
    const onTrigger = (event.target as HTMLElement).closest("[data-currency-toggle]")
    if (!inside && !onTrigger) closeAll()
  })
}

function bindAccountIndicator(): void {
  const hasSession = Boolean(readStorage("toonhub_token", ""))
  if (!hasSession) return
  $$<HTMLElement>("[data-account-dot]").forEach((dot) => {
    dot.hidden = false
  })
}

/* -------------------------------------------------------------------------- */
/* Announcement rotator                                                       */
/* -------------------------------------------------------------------------- */

function bindAnnouncements(): void {
  const messages = $$<HTMLElement>(".announcement-msg")
  if (messages.length < 2) return

  const interval = 4200
  let index = 0
  let timer = 0

  const show = (next: number) => {
    messages[index]?.classList.remove("is-active")
    index = ((next % messages.length) + messages.length) % messages.length
    const current = messages[index]
    current?.classList.add("is-active")
    current?.setAttribute("aria-current", "true")
    messages.forEach((message, i) => {
      if (i !== index) message.removeAttribute("aria-current")
    })
  }

  const start = () => {
    if (timer || prefersReducedMotion()) return
    timer = window.setInterval(() => show(index + 1), interval)
  }
  const stop = () => {
    window.clearInterval(timer)
    timer = 0
  }

  messages[0]?.setAttribute("aria-current", "true")
  start()

  // Pause when the tab is hidden or the pointer is over the bar.
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()))
  messages[0]?.parentElement?.addEventListener("mouseenter", stop)
  messages[0]?.parentElement?.addEventListener("mouseleave", start)
}

/* -------------------------------------------------------------------------- */
/* Clearance countdown                                                        */
/* -------------------------------------------------------------------------- */

function bindCountdown(): void {
  const root = $<HTMLElement>("[data-countdown]")
  if (!root) return

  const windowMs = SALE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const stored = Number(readStorage(STORAGE_KEYS.saleEnd, 0))
  const end = stored && stored > Date.now() ? stored : Date.now() + windowMs
  if (stored !== end) writeStorage(STORAGE_KEYS.saleEnd, end)

  const fields: Record<string, HTMLElement | null> = {
    days: $("[data-countdown-days]", root),
    hours: $("[data-countdown-hours]", root),
    minutes: $("[data-countdown-minutes]", root),
    seconds: $("[data-countdown-seconds]", root),
  }

  const pad = (value: number) => String(value).padStart(2, "0")

  const tick = () => {
    const diff = Math.max(0, end - Date.now())
    const next: Record<string, string> = {
      days: pad(Math.floor(diff / 86_400_000)),
      hours: pad(Math.floor((diff % 86_400_000) / 3_600_000)),
      minutes: pad(Math.floor((diff % 3_600_000) / 60_000)),
      seconds: pad(Math.floor((diff % 60_000) / 1000)),
    }
    for (const key of Object.keys(fields)) {
      const el = fields[key]
      if (!el || el.textContent === next[key]) continue
      el.textContent = next[key]
    }
    if (diff <= 0) window.clearInterval(timer)
  }

  tick()
  const timer = window.setInterval(tick, 1000)

  // The whole block is decorative for screen readers; a summary is announced
  // once instead of every second.
  const summary = $<HTMLElement>("[data-countdown-summary]", root)
  if (summary) {
    summary.textContent = SITE.offer
  }
}

/* -------------------------------------------------------------------------- */
/* Drag / arrow sliders                                                       */
/* -------------------------------------------------------------------------- */

function bindSliders(): void {
  const sliders = $$<HTMLElement>("[data-slider-track]")
  if (!sliders.length) return

  for (const track of sliders) {
    const scroller = track.closest<HTMLElement>("[data-slider-scroller]") || track.parentElement
    if (!scroller) continue
    const root = scroller.closest<HTMLElement>("[data-slider]") || scroller

    let dragging = false
    let moved = false
    let startX = 0
    let startScroll = 0

    scroller.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return
      dragging = true
      moved = false
      startX = event.pageX
      startScroll = scroller.scrollLeft
      scroller.classList.add("is-dragging")
    })
    scroller.addEventListener("pointermove", (event) => {
      if (!dragging) return
      const delta = event.pageX - startX
      if (Math.abs(delta) > 5) moved = true
      scroller.scrollLeft = startScroll - delta
    })
    const stopDrag = () => {
      dragging = false
      scroller.classList.remove("is-dragging")
    }
    window.addEventListener("pointerup", stopDrag)
    window.addEventListener("pointercancel", stopDrag)
    scroller.addEventListener("dragstart", (event) => event.preventDefault())
    // A drag that ends on a card must not navigate.
    scroller.addEventListener(
      "click",
      (event) => {
        if (!moved) return
        event.preventDefault()
        event.stopPropagation()
        moved = false
      },
      true,
    )

    const step = () => {
      const card = $<HTMLElement>("[data-slider-item]", track)
      const gap = Number.parseFloat(getComputedStyle(track).columnGap || "16") || 16
      return (card ? card.getBoundingClientRect().width : 240) + gap
    }

    const scrollByStep = (direction: 1 | -1) => {
      scroller.scrollBy({
        left: direction * step(),
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      })
      updateArrows()
    }

    const prev = $<HTMLButtonElement>("[data-slider-prev]", root)
    const next = $<HTMLButtonElement>("[data-slider-next]", root)
    prev?.addEventListener("click", () => scrollByStep(-1))
    next?.addEventListener("click", () => scrollByStep(1))

    const updateArrows = () => {
      const max = scroller.scrollWidth - scroller.clientWidth
      if (prev) prev.disabled = scroller.scrollLeft <= 2
      if (next) next.disabled = scroller.scrollLeft >= max - 2
      root?.classList.toggle("is-scrollable", max > 4)
    }

    scroller.addEventListener("scroll", updateArrows, { passive: true })
    window.addEventListener("resize", updateArrows)
    updateArrows()

    // Keyboard users get the same controls through the arrow buttons; the
    // scroller itself is focusable so ← → work natively.
    scroller.setAttribute("tabindex", "0")
    scroller.setAttribute("role", "group")
  }
}

/* -------------------------------------------------------------------------- */
/* Desktop hover menus (`<details>` that also open on focus)                  */
/* -------------------------------------------------------------------------- */

function bindNavDetails(): void {
  $$<HTMLDetailsElement>("details[data-nav-dropdown]").forEach((details) => {
    details.addEventListener("mouseenter", () => {
      if (prefersReducedMotion()) return
      details.open = true
    })
    details.addEventListener("mouseleave", () => {
      details.open = false
    })
    details.addEventListener("focusin", () => {
      details.open = true
    })
    details.addEventListener("focusout", (event) => {
      if (!details.contains((event as FocusEvent).relatedTarget as Node)) details.open = false
    })
  })
}

/* -------------------------------------------------------------------------- */
/* Image fade-in — the one bit of polish that needs JS                        */
/* -------------------------------------------------------------------------- */

function bindImageReveal(): void {
  if (prefersReducedMotion()) {
    document.documentElement.classList.add("no-motion")
    return
  }
  document.addEventListener(
    "load",
    (event) => {
      const target = event.target as HTMLElement
      if (target?.tagName === "IMG") target.classList.add("is-loaded")
    },
    true,
  )
  // Images that finished before the listener attached.
  $$<HTMLImageElement>("img.media__img").forEach((img) => {
    if (img.complete && img.naturalWidth > 0) img.classList.add("is-loaded")
  })
}

/* -------------------------------------------------------------------------- */

function init(): void {
  bindOverlays()
  bindCurrencyMenus()
  bindAccountIndicator()
  bindAnnouncements()
  bindCountdown()
  bindSliders()
  bindNavDetails()
  bindImageReveal()
  lockBody()
}

ready(init)
