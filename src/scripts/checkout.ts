/**
 * Checkout page behaviour: country/province selection, express-pay toggling,
 * address -> payment -> review stepping and the order-summary totals.
 *
 * Extracted verbatim from the page's <script> block so checkout follows the same
 * one-module-per-surface rule as the rest of the storefront. Astro bundled the
 * inline form to an external file anyway, so this changes organisation and
 * nothing else.
 */
import { provincesOf, countryFromCurrency, countryFromTimezone, COUNTRIES, countryName } from "../lib/regions"

/** One order-summary line, as stored in `toonhub_local_cart`. */
interface SummaryLine {
  id?: string
  title?: string
  variant_title?: string
  thumbnail?: string
  quantity?: number
  unit_price?: number
}

/**
 * Summary rows are built as an HTML string, so every interpolated value is
 * escaped — cart titles come from the catalogue (or from a `?t=` deep link)
 * and must never be able to inject markup.
 */
function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  )
}

const form = document.getElementById("coForm") as HTMLFormElement
const countrySelect = document.getElementById("countrySelect") as HTMLSelectElement
const provinceSelect = document.getElementById("provinceSelect") as HTMLSelectElement
let cartId = ""
let cart: any = null
let providers: { id: string; label: string }[] = []
let shipping: any[] = []
let stripe: any = null
let cardEl: any = null
let stripeKey = ""
let selectedPay = ""

const fmt = (n: number, c = "usd") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: (c || "usd").toUpperCase() }).format((n || 0) / 100)
  } catch {
    return `$${((n || 0) / 100).toFixed(2)}`
  }
}

function cookieCurrency() {
  try {
    const m = document.cookie.match(/(?:^|; )toonhub_currency=([^;]+)/)
    return (m ? decodeURIComponent(m[1]) : "usd").toLowerCase()
  } catch { return "usd" }
}

function showError(msg: string) {
  const el = document.getElementById("coError")!
  el.hidden = !msg
  el.textContent = msg
}

const provinceText = document.getElementById("provinceText") as HTMLInputElement
const countryOther = document.getElementById("countryOther") as HTMLInputElement
const countryOtherRow = document.getElementById("countryOtherRow") as HTMLElement
const COUNTRY_SET = new Set(COUNTRIES.map((c) => c.code))

function syncCountryExtra() {
  const other = countrySelect.value === "OTHER"
  countryOtherRow.hidden = !other
  countryOther.required = other
  if (!other) countryOther.value = ""
}

function fillProvinces(country: string, selected = "") {
  syncCountryExtra()
  const list = provincesOf(country)
  if (!list.length) {
    provinceSelect.hidden = true
    provinceSelect.required = false
    provinceSelect.innerHTML = `<option value="">Province / state</option>`
    provinceSelect.value = ""
    provinceText.hidden = false
    provinceText.value = selected
    return
  }
  provinceText.hidden = true
  provinceText.value = ""
  provinceSelect.hidden = false
  provinceSelect.required = true
  provinceSelect.innerHTML =
    `<option value="">Select province / state</option>` +
    list.map((p) => `<option value="${p.code}" ${p.code === selected || p.name === selected ? "selected" : ""}>${p.name}</option>`).join("")
}

function findPayUrl(obj: any, depth = 0): string | null {
  if (!obj || depth > 5) return null
  if (typeof obj === "string" && /^https?:\/\//.test(obj)) return obj
  if (obj.url && typeof obj.url === "string") return obj.url
  if (obj.approval_url) return obj.approval_url
  if (Array.isArray(obj.links)) {
    const a = obj.links.find((l: any) => /approve|payer-action|redirect/i.test(l.rel || "") || l.href)
    if (a?.href) return a.href
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const u = findPayUrl(v, depth + 1)
      if (u) return u
    }
  }
  return null
}

function bogo(items: any[]) {
  const units: number[] = []
  for (const it of items) for (let i = 0; i < (it.quantity || 1); i++) units.push(Number(it.unit_price) || 0)
  units.sort((a, b) => b - a)
  let d = 0
  for (let i = 0; i + 1 < units.length; i += 2) d += Math.round(Math.min(units[i], units[i + 1]) * 0.5)
  return d
}

function shipAmount(s: any) {
  const n = Number(
    s?.amount ??
    s?.calculated_price?.calculated_amount ??
    s?.calculated_price?.original_amount ??
    0,
  )
  return Number.isFinite(n) ? n : 0
}

/** Ignore Medusa placeholder rates like 0.1 / $0.10 until real options are configured. */
function isConfiguredShip(s: any) {
  const n = shipAmount(s)
  if (!n) return true
  if (n > 0 && n < 1) return false
  if (n > 0 && n <= 10) return false
  return true
}

function liveShipping() {
  return (shipping || []).filter(isConfiguredShip)
}

function renderSummary() {
  const items = cart?.items || []
  const currency = cart?.currency || cookieCurrency()
  const box = document.getElementById("coLines")!
  box.innerHTML = items.map((i: SummaryLine) => {
    const qty = Number(i.quantity) || 0
    const unit = Number(i.unit_price) || 0
    const label = esc(i.title || "Item")
    const thumb = i.thumbnail
      ? `<img class="co-thumb" src="${esc(i.thumbnail)}" alt="${label}" width="64" height="64" loading="lazy" decoding="async" />`
      : `<div class="co-thumb" role="img" aria-label="${label}"></div>`
    return `
    <div class="co-line">
      <div style="position:relative;flex-shrink:0">
        ${thumb}
        <span class="co-qty">${qty}</span>
      </div>
      <div class="co-title">
        ${label}
        ${i.variant_title ? `<div style="font-weight:400;color:#888;font-size:0.78rem;text-transform:none;margin-top:4px;">${esc(i.variant_title)}</div>` : ""}
        <div class="co-qty-price">Qty ${qty} · ${fmt(unit, currency)} each</div>
      </div>
      <div class="co-price">${fmt(unit * qty, currency)}</div>
    </div>
  `}).join("") || `<p style="color:#888;font-size:0.9rem;">Your cart is empty.</p>`
  const sum = cart?.subtotal ?? items.reduce((total: number, i: SummaryLine) => total + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0)
  const disc = cart?.discount_total || bogo(items)
  document.getElementById("coSub")!.textContent = fmt(sum, currency)
  const live = liveShipping()
  const shipRaw = Number(cart?.shipping_total || 0)
  const shipIsDummy = shipRaw > 0 && (shipRaw < 1 || shipRaw <= 10)
  const shipTxt = !live.length || !shipRaw || shipIsDummy ? "Free" : fmt(shipRaw, currency)
  document.getElementById("coShip")!.textContent = shipTxt
  const row = document.getElementById("coDiscRow")!
  row.hidden = !disc
  if (disc) document.getElementById("coDisc")!.textContent = `−${fmt(disc, currency)}`
  const totalBase = shipIsDummy ? Math.max(0, sum - disc) : (cart?.total ?? Math.max(0, sum - disc))
  const totalTxt = fmt(totalBase, currency)
  document.getElementById("coTotal")!.textContent = totalTxt
  const mini = document.getElementById("coTotalMini")
  if (mini) mini.textContent = totalTxt
}

function renderShipping() {
  const box = document.getElementById("shipList")!
  const live = liveShipping()
  if (!live.length) {
    box.textContent = "Free worldwide shipping included · 2–3 day processing"
    return
  }
  const first = live[0]
  const amt = shipAmount(first)
  if (live.length === 1) {
    box.innerHTML = `${first.name || "Shipping"} · <strong>${!amt ? "Free" : fmt(amt, cart?.currency)}</strong>
      <input type="hidden" name="ship" value="${first.id}" />`
    return
  }
  box.innerHTML = live.map((s, i) => {
    const n = shipAmount(s)
    return `
    <label class="co-ship-opt">
      <span><input type="radio" name="ship" value="${s.id}" ${i === 0 ? "checked" : ""} /> ${s.name || s.id}</span>
      <strong>${!n ? "Free" : fmt(n, cart?.currency)}</strong>
    </label>`
  }).join("")
}

function renderPay() {
  const reserved = document.getElementById("payReserved")!
  const box = document.getElementById("payList")!
  const btn = document.getElementById("payBtn") as HTMLButtonElement
  if (!providers.length) {
    reserved.hidden = false
    box.hidden = true
    btn.textContent = "Place order — free shipping"
    selectedPay = ""
    return
  }
  reserved.hidden = true
  box.hidden = false
  box.innerHTML = providers.map((p, i) => `
    <label class="${i === 0 ? "is-on" : ""}" data-pay="${p.id}">
      <input type="radio" name="pay" value="${p.id}" ${i === 0 ? "checked" : ""} />
      <span>${p.label}</span>
    </label>
  `).join("")
  selectedPay = providers[0]?.id || ""
  btn.textContent = /paypal|stripe|card/i.test(selectedPay) ? "Pay now" : "Place order"
  toggleCard()
  box.querySelectorAll("label").forEach((lab) => {
    lab.addEventListener("click", () => {
      box.querySelectorAll("label").forEach((x) => x.classList.remove("is-on"))
      lab.classList.add("is-on")
      selectedPay = lab.getAttribute("data-pay") || ""
      toggleCard()
    })
  })
}

function toggleCard() {
  const isCard = /stripe|card/i.test(selectedPay)
  const box = document.getElementById("cardBox") as HTMLElement
  box.hidden = !isCard
  if (isCard && stripe && !cardEl) {
    const elements = stripe.elements()
    cardEl = elements.create("card", { hidePostalCode: true, style: { base: { fontSize: "16px", color: "#fff", iconColor: "#fff", "::placeholder": { color: "#888" } } } })
    cardEl.mount("#card-element")
    cardEl.on("change", (e: any) => {
      document.getElementById("card-errors")!.textContent = e.error?.message || ""
    })
  }
}

async function api(action: string, extra: any = {}) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, cartId, ...extra }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Request failed")
  if (data.cart) cart = data.cart
  return data
}

function formPayload() {
  const fd = new FormData(form)
  return {
    email: String(fd.get("email") || "").trim(),
    name: String(fd.get("name") || "").trim(),
    address: String(fd.get("address") || ""),
    apartment: String(fd.get("apartment") || ""),
    city: String(fd.get("city") || ""),
    postal: String(fd.get("postal") || ""),
    country: String(fd.get("country") || "US"),
    countryOther: String(fd.get("countryOther") || "").trim(),
    province: String(fd.get("province") || fd.get("provinceText") || ""),
    phone: String(fd.get("phone") || ""),
    newsletter: true,
  }
}

function persistAddress() {
  try { localStorage.setItem("toonhub_checkout", JSON.stringify(formPayload())) } catch {}
}

function showOptional(id: string, on: boolean) {
  const el = document.getElementById(id)
  if (el) el.hidden = !on
}

function setCompact(on: boolean) {
  const box = document.getElementById("savedBox")!
  const fields = document.getElementById("addrFields")!
  box.hidden = !on
  fields.hidden = on
  if (on) {
    const p = formPayload()
    document.getElementById("savedName")!.textContent = p.name
    const countryLabel = p.country === "OTHER" ? (p.countryOther || "Other") : countryName(p.country)
    document.getElementById("savedLine")!.textContent = [p.address, p.city, p.postal, countryLabel].filter(Boolean).join(", ")
    document.getElementById("savedMail")!.textContent = p.email
  }
}

function restoreAddress() {
  let saved: any = {}
  try { saved = JSON.parse(localStorage.getItem("toonhub_checkout") || "{}") } catch { saved = {} }
  const email = saved.email || localStorage.getItem("toonhub_email") || ""
  if (email) (form.querySelector('[name="email"]') as HTMLInputElement).value = email
  if (saved.name) (form.querySelector('[name="name"]') as HTMLInputElement).value = saved.name
  ;["address", "apartment", "city", "postal", "phone"].forEach((k) => {
    if (saved[k]) (form.querySelector(`[name="${k}"]`) as HTMLInputElement).value = saved[k]
  })
  if (saved.apartment) {
    showOptional("aptRow", true)
    const t = document.getElementById("toggleApt")
    if (t) t.hidden = true
  }
  if (saved.phone) {
    showOptional("phoneRow", true)
    const t = document.getElementById("togglePhone")
    if (t) t.hidden = true
  }
  const guessed = countryFromTimezone() || countryFromCurrency(cookieCurrency())
  const country = saved.country || guessed
  if (country === "OTHER" || (country && !COUNTRY_SET.has(country))) {
    countrySelect.value = "OTHER"
  } else {
    countrySelect.value = COUNTRY_SET.has(country) ? country : "US"
  }
  fillProvinces(countrySelect.value, saved.province || "")
  if (countrySelect.value === "OTHER") {
    countryOther.value = saved.countryOther || (!COUNTRY_SET.has(country) ? String(country) : "")
  }
  const needsProv = provincesOf(countrySelect.value).length > 0
  const complete = Boolean(saved.email && saved.name && saved.address && saved.city && saved.postal && (!needsProv || saved.province))
  setCompact(complete)
  if (!email) document.getElementById("coEmail")?.focus()
  else if (!complete) document.getElementById("coName")?.focus()
}



async function saveAddress() {
  const p = formPayload()
  persistAddress()
  if (!cartId || !p.email || !p.address) return
  await api("update", p)
  const shipId = (form.querySelector('input[name="ship"]:checked, input[name="ship"][type="hidden"]') as HTMLInputElement | null)?.value
  const chosen = liveShipping().find((s) => s.id === shipId)
  if (shipId && chosen) await api("shipping", { optionId: shipId })
  renderSummary()
}

function snapshotLocal(email: string) {
  const items = cart?.items || []
  const order = {
    id: "TH" + Date.now().toString(36).toUpperCase(),
    email,
    created: new Date().toISOString(),
    items: items.map((i: any) => ({ title: i.title, quantity: i.quantity, unit_price: i.unit_price })),
    total: cart?.total || 0,
  }
  try {
    const prev = JSON.parse(localStorage.getItem("toonhub_orders") || "[]")
    prev.unshift(order)
    localStorage.setItem("toonhub_orders", JSON.stringify(prev.slice(0, 20)))
  } catch {}
  return order
}

async function completeOrder() {
  const data = await api("complete")
  if (data.order) {
    try { localStorage.removeItem("cartId"); localStorage.removeItem("toonhub_local_cart") } catch {}
    const id = data.order.display_id || data.order.id
    window.location.href = `/checkout/success?order=${encodeURIComponent(id)}&email=${encodeURIComponent(data.order.email || "")}`
    return
  }
  throw new Error("Payment was not completed")
}

async function payFlow(providerId: string) {
  showError("")
  const btn = document.getElementById("payBtn") as HTMLButtonElement
  btn.disabled = true
  btn.textContent = "Processing…"
  const p = formPayload()
  try {
    await saveAddress()
    const local = snapshotLocal(p.email)
    if (providerId && cartId) {
      const data = await api("pay", { providerId })
      const session = data.session
      const secret = session?.data?.client_secret || session?.data?.clientSecret
      if (secret && stripe) {
        const result = await stripe.confirmCardPayment(secret, { payment_method: { card: cardEl } })
        if (result.error) throw new Error(result.error.message)
      }
      const redirect = findPayUrl(session?.data)
      if (redirect && /paypal/i.test(providerId)) {
        window.location.href = redirect
        return
      }
      await completeOrder()
      return
    }
    if (cartId) {
      try {
        await completeOrder()
        return
      } catch { /* no payment provider yet */ }
    }
    window.location.href = `/checkout/success?order=${encodeURIComponent(local.id)}&email=${encodeURIComponent(p.email)}`
  } catch (e: any) {
    showError(e.message || "Checkout failed")
    btn.disabled = false
    btn.textContent = providers.length ? "Pay now" : "Place order — free shipping"
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault()
  if (countrySelect.value === "OTHER" && !countryOther.value.trim()) {
    showError("Please enter your country name.")
    countryOther.focus()
    return
  }
  if (provinceSelect.required && !provinceSelect.value) {
    showError("Please select your province / state.")
    provinceSelect.focus()
    return
  }
  await payFlow(selectedPay)
})

countrySelect.addEventListener("change", () => fillProvinces(countrySelect.value))
document.getElementById("editAddr")?.addEventListener("click", () => setCompact(false))
document.getElementById("toggleApt")?.addEventListener("click", () => {
  showOptional("aptRow", true)
  ;(document.getElementById("toggleApt") as HTMLElement).hidden = true
  form.querySelector<HTMLInputElement>('[name="apartment"]')?.focus()
})
document.getElementById("togglePhone")?.addEventListener("click", () => {
  showOptional("phoneRow", true)
  ;(document.getElementById("togglePhone") as HTMLElement).hidden = true
  form.querySelector<HTMLInputElement>('[name="phone"]')?.focus()
})

document.getElementById("discountBtn")?.addEventListener("click", async () => {
  const code = (document.getElementById("discountCode") as HTMLInputElement).value.trim()
  if (!code) return
  try {
    await api("discount", { code })
    renderSummary()
  } catch (e: any) {
    showError(e.message)
  }
})

async function boot() {
  restoreAddress()
  cartId = localStorage.getItem("cartId") || ""
  let localItems: any[] = []
  try { localItems = JSON.parse(localStorage.getItem("toonhub_local_cart") || "[]") } catch { localItems = [] }

  if (cartId) {
    try {
      const cfg = await fetch("/api/checkout?action=config").then((r) => r.json())
      stripeKey = cfg.stripeKey || ""
      if (stripeKey) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script")
          s.src = "https://js.stripe.com/v3/"
          s.onload = () => resolve()
          s.onerror = () => reject()
          document.head.appendChild(s)
        }).catch(() => {})
        if ((window as any).Stripe) stripe = (window as any).Stripe(stripeKey)
      }
      const res = await fetch(`/api/checkout?cartId=${encodeURIComponent(cartId)}`)
      const data = await res.json()
      if (res.ok) {
        cart = data.cart
        shipping = data.shipping_options || []
        providers = (data.payment_providers || []).filter((p: any) => {
          if (!p?.id || /system|manual|offline/i.test(p.id)) return false
          if (/stripe|card/i.test(p.id) && !stripeKey) return false
          if (/paypal/i.test(p.id) && !cfg.paypalClientId) return false
          if (/apple|google|gpay|wallet/i.test(p.id) && !stripeKey && !cfg.paypalClientId) return false
          return true
        })
      }
    } catch { /* local cart */ }
  }

  if (!cart?.items?.length && localItems.length) {
    cart = {
      items: localItems,
      currency: cookieCurrency(),
      subtotal: localItems.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0),
    }
  }
  if (!cart?.items?.length) {
    window.location.href = "/cart"
    return
  }
  renderSummary()
  renderShipping()
  renderPay()
  if (new URLSearchParams(location.search).get("paypal") === "return" && cartId) {
    try { await completeOrder() } catch (e: any) { showError(e.message) }
  }
}

boot().catch((e) => showError(e.message || "Checkout unavailable"))
