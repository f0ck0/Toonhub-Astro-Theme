/**
 * DOM helpers shared by the storefront scripts.
 *
 * The theme ships **no framework islands** — every interaction is a few dozen
 * lines of vanilla TS bound through event delegation on `document`, so markup
 * injected later (infinite scroll, quick view) keeps working without re-binding.
 */

export function $<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector)
}

export function $$<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector))
}

/** HTML-escape anything interpolated into `innerHTML`. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  )
}

/** Escape a value for safe use inside a URL path segment. */
export function escapePath(value: unknown): string {
  return encodeURIComponent(String(value ?? "").trim()).replace(/%2F/g, "/")
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Run `fn` once the DOM is parsed (modules are deferred, so usually now). */
export function ready(fn: () => void): void {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true })
  else fn()
}

/** Defer non-critical work until the main thread is idle. */
export function whenIdle(fn: () => void, timeout = 2000): void {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback
  if (typeof ric === "function") ric(fn, { timeout })
  else window.setTimeout(fn, 350)
}

/* -------------------------------------------------------------------------- */
/* Overlays: drawers, modals, quick view                                      */
/* -------------------------------------------------------------------------- */

/** Ids of every overlay that can lock the page behind it. */
const OVERLAY_IDS = ["cartDrawer", "mobileNav", "searchModal", "quickView", "lightbox"] as const

export type OverlayId = (typeof OVERLAY_IDS)[number] | string

/** Elements that can receive focus inside a dialog. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface FocusMemory {
  trigger: HTMLElement | null
}

const focusMemory = new Map<string, FocusMemory>()

export function isOpen(id: OverlayId): boolean {
  return $(`#${id}`)?.classList.contains("open") ?? false
}

export function anyOverlayOpen(): boolean {
  return OVERLAY_IDS.some((id) => isOpen(id))
}

export function lockBody(): void {
  document.body.classList.toggle("drawer-open", anyOverlayOpen())
}

/**
 * Open/close an overlay while keeping the a11y contract intact:
 * `aria-hidden`, `inert` (so background content leaves the tab order) and
 * focus move/restore.
 */
export function setOpen(id: OverlayId, open: boolean, options: { focus?: boolean } = {}): void {
  const el = $(`#${id}`)
  if (!el) return
  const { focus = true } = options

  el.classList.toggle("open", open)
  if (el.hasAttribute("aria-hidden") || el.hasAttribute("inert")) {
    if (open) el.setAttribute("aria-hidden", "false")
    else el.setAttribute("aria-hidden", "true")
  }
  if (open) el.removeAttribute("inert")
  else el.setAttribute("inert", "")

  if (open) {
    if (!focusMemory.has(id)) {
      focusMemory.set(id, { trigger: document.activeElement as HTMLElement | null })
    }
    if (focus) {
      // Wait a frame so the element is visible before it can take focus.
      requestAnimationFrame(() => {
        const target =
          $<HTMLElement>("[data-autofocus]", el) ||
          $<HTMLElement>("input:not([type=hidden])", el) ||
          $<HTMLElement>(FOCUSABLE, el)
        target?.focus({ preventScroll: true })
      })
    }
    el.addEventListener("keydown", (event) => trapFocus(event as KeyboardEvent, el))
  } else {
    const memory = focusMemory.get(id)
    focusMemory.delete(id)
    if (memory?.trigger?.isConnected) {
      try {
        memory.trigger.focus({ preventScroll: true })
      } catch {
        /* element went away */
      }
    }
  }

  lockBody()
}

/** Keep Tab inside an open dialog (WCAG 2.4.3 focus order). */
function trapFocus(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== "Tab") return
  const nodes = $$<HTMLElement>(FOCUSABLE, container).filter(
    (node) => node.offsetParent !== null || node === document.activeElement,
  )
  if (!nodes.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

/** Close whichever overlay is on top; called from the global Escape handler. */
export function closeTopOverlay(): boolean {
  const order: OverlayId[] = ["quickView", "searchModal", "cartDrawer", "mobileNav", "lightbox"]
  for (const id of order) {
    if (!isOpen(id)) continue
    if (id === "lightbox") {
      $("#lightbox")?.classList.remove("open")
      lockBody()
      return true
    }
    setOpen(id, false)
    return true
  }
  return false
}

/* -------------------------------------------------------------------------- */
/* Small DOM utilities                                                        */
/* -------------------------------------------------------------------------- */

export function setText(id: string, text: string): void {
  const el = $(`#${id}`)
  if (el) el.textContent = text
}

export function toggleHidden(el: Element | null, hidden: boolean): void {
  if (!el) return
  el.classList.toggle("hidden", hidden)
  if (hidden) el.setAttribute("aria-hidden", "true")
  else el.removeAttribute("aria-hidden")
}

/** Announce a transient message politely (used for cart / form feedback). */
export function announce(message: string, region = "[data-live-region]"): void {
  const el = $<HTMLElement>(region)
  if (!el) return
  el.textContent = ""
  // Reset so repeated identical messages are still announced.
  window.setTimeout(() => {
    el.textContent = message
  }, 60)
}
