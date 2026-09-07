/**
 * Order tracking (`/track-order`).
 *
 * Two lookups in one form:
 * 1. **Medusa order** — order number + email, resolved through `/api/track`;
 * 2. **Carrier fallback** — a pasted tracking number opens 17TRACK in a new tab.
 *
 * Every value that reaches the DOM comes from an API response or a query
 * string, so it is escaped before interpolation and the result region is an
 * `aria-live` status rather than a silent innerHTML swap.
 */

import { $, escapeHtml, ready } from "./lib/dom"

interface TrackingEntry {
  tracking_number?: string
  number?: string
  id?: string
  url?: string
  tracking_url?: string
}

interface TrackedOrder {
  id?: string
  display_id?: string | number
  status?: string
  email?: string
  created_at?: string
  tracking?: TrackingEntry[]
}

/**
 * Localised copy is passed in through `data-i18n-*` attributes on the form.
 * HTML lower-cases attribute names, so the kebab-case suffix is camelCased
 * here (`data-i18n-need-both` → `needBoth`).
 */
function dict(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {}
  for (const attribute of Array.from(form.attributes)) {
    if (!attribute.name.startsWith("data-i18n-")) continue
    const key = attribute.name
      .slice("data-i18n-".length)
      .replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())
    out[key] = attribute.value
  }
  return out
}

function carrierUrl(number: string, href = ""): string {
  if (href && /^https?:\/\//i.test(href)) return href
  return `https://t.17track.net/en#nums=${encodeURIComponent(number)}`
}

function openCarrier(number: string, href = ""): void {
  window.open(carrierUrl(number, href), "_blank", "noopener,noreferrer")
}

function formatDate(value?: string): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleString()
}

function resultBox(): HTMLElement | null {
  return $<HTMLElement>("[data-track-result]")
}

function render(html: string): void {
  const box = resultBox()
  if (!box) return
  box.innerHTML = html
  box.hidden = !html
}

function orderTemplate(order: TrackedOrder, labels: Record<string, string>, parcel: string): string {
  const id = String(order.display_id || order.id || "")
  const tracks = (order.tracking || [])
    .map((entry) => {
      const number = String(entry.tracking_number || entry.number || entry.id || "")
      const href = String(entry.url || entry.tracking_url || "")
      if (!number && !href) return ""
      const target = carrierUrl(number, href)
      return `<p class="track-result__row"><span>${escapeHtml(labels.tracking || "Tracking")}</span>
        <a href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer">${escapeHtml(number || labels.openCarrier || "Open carrier")}</a></p>`
    })
    .join("")

  const parcelRow = parcel
    ? `<p class="track-result__row"><span>${escapeHtml(labels.parcel || "Parcel")}</span>
        <a href="${escapeHtml(carrierUrl(parcel))}" target="_blank" rel="noopener noreferrer">${escapeHtml(parcel)}</a></p>`
    : ""

  return `<h2 class="track-result__heading">${escapeHtml(
    (labels.orderHeading || "Order {id}").replace("{id}", id),
  )}</h2>
    <p class="track-result__row"><span>${escapeHtml(labels.status || "Status")}</span>
      <strong>${escapeHtml(String(order.status || ""))}</strong></p>
    ${
      formatDate(order.created_at)
        ? `<p class="track-result__meta">${escapeHtml(
            (labels.placed || "Placed {date}").replace("{date}", formatDate(order.created_at)),
          )}</p>`
        : ""
    }
    ${tracks || `<p class="track-result__meta">${escapeHtml(labels.noTracking || "")}</p>`}
    ${parcelRow}
    ${
      order.email
        ? `<p class="track-result__meta">${escapeHtml(
            (labels.updatesTo || "Updates will be emailed to {email}.").replace("{email}", order.email),
          )}</p>`
        : ""
    }`
}

async function lookup(form: HTMLFormElement): Promise<void> {
  const labels = dict(form)
  const box = resultBox()
  const data = new FormData(form)
  const id = String(data.get("order") || "").trim()
  const email = String(data.get("email") || "").trim().toLowerCase()
  const parcel = String(data.get("parcel") || "").trim()

  if (box) box.setAttribute("aria-busy", "true")

  // Parcel-only lookup: go straight to the carrier.
  if (parcel && !id) {
    render(
      `<p class="track-result__meta">${escapeHtml(
        (labels.openingCarrier || "Opening carrier tracking for {number}.").replace("{number}", parcel),
      )}</p>`,
    )
    openCarrier(parcel)
    box?.setAttribute("aria-busy", "false")
    return
  }

  if (!id || !email) {
    render(`<p class="track-result__meta">${escapeHtml(labels.needBoth || "")}</p>`)
    box?.setAttribute("aria-busy", "false")
    return
  }

  render(`<p class="track-result__meta">${escapeHtml(labels.looking || "Looking up your order…")}</p>`)

  try {
    const response = await fetch(
      `/api/track?order=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(20000) },
    )
    const payload = (await response.json().catch(() => ({}))) as { order?: TrackedOrder }
    if (response.ok && payload.order) {
      render(orderTemplate(payload.order, labels, parcel))
      box?.setAttribute("aria-busy", "false")
      return
    }
  } catch {
    /* fall through to the not-found copy below */
  }

  if (parcel) {
    render(
      `<p class="track-result__meta">${escapeHtml(
        (labels.noMatchParcel || "Opening carrier tracking for {number}…").replace("{number}", parcel),
      )}</p>`,
    )
    openCarrier(parcel)
  } else {
    render(`<p class="track-result__meta">${escapeHtml(labels.notFound || "")}</p>`)
  }
  box?.setAttribute("aria-busy", "false")
}

function init(): void {
  const form = $<HTMLFormElement>("[data-track-form]")
  if (!form) return

  const params = new URLSearchParams(window.location.search)
  let storedEmail = ""
  try {
    storedEmail = window.localStorage.getItem("toonhub_email") || ""
  } catch {
    storedEmail = ""
  }

  const presets: Record<string, string> = {
    order: params.get("order") || "",
    email: params.get("email") || storedEmail,
    parcel: params.get("tracking") || params.get("parcel") || "",
  }
  for (const [name, value] of Object.entries(presets)) {
    const field = $<HTMLInputElement>(`[name='${name}']`, form)
    if (field && value) field.value = value
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    void lookup(form)
  })

  // Deep links from the order-confirmation email run the lookup immediately.
  if (presets.order && presets.email) void lookup(form)
}

ready(init)
