/**
 * Account page behaviour: login / registration, profile editing, address book and
 * order history with tracking links.
 *
 * Extracted verbatim from the page's <script> block. The 11-line `is:inline`
 * boot script stays in account.astro on purpose: it must run before first paint
 * to add `has-account` and avoid a flash of the guest panel.
 */
/**
 * Account data (names, addresses, order titles, tracking URLs) comes from the
 * Medusa API and from `localStorage`, and is injected as HTML — every value is
 * escaped here so a crafted product title cannot inject markup.
 */
function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  )
}

interface AddressLike {
  first_name?: string
  last_name?: string
  name?: string
  address_1?: string
  address?: string
  street?: string
  address_2?: string
  apartment?: string
  city?: string
  province?: string
  province_code?: string
  state?: string
  postal_code?: string
  postal?: string
  country_code?: string
  country?: string
  phone?: string
}

interface TrackingLike {
  tracking_number?: string
  number?: string
  url?: string
  tracking_url?: string
  carrier?: string
}

interface OrderLine { title?: string }

interface OrderLike {
  id?: string
  display_id?: string | number
  created_at?: string
  created?: string
  status?: string
  fulfillment_status?: string
  total?: number
  summary?: { total?: number }
  currency_code?: string
  currency?: string
  email?: string
  items?: OrderLine[]
  line_items?: OrderLine[]
  tracking?: (TrackingLike | string)[]
  tracking_numbers?: (TrackingLike | string)[]
}

const TOKEN_KEY = "toonhub_token"
const EMAIL_KEY = "toonhub_email"
const CUSTOMER_KEY = "toonhub_customer"
const form = document.getElementById("accountForm") as HTMLFormElement
const loginBtn = document.getElementById("loginBtn") as HTMLButtonElement
const loginError = document.getElementById("loginError") as HTMLElement
const guest = document.getElementById("accountGuest")!
const home = document.getElementById("accountHome")!
const names = document.getElementById("registerNames") as HTMLElement
const pass2 = document.getElementById("loginPassword2") as HTMLInputElement
const title = document.querySelector(".account-title") as HTMLElement
const sub = document.querySelector(".account-sub") as HTMLElement
let mode = new URLSearchParams(location.search).get("mode") === "register" ? "register" : "login"

function tokenOf(data: any): string {
  if (!data) return ""
  if (typeof data === "string") return data
  return data.token || data.access_token || (typeof data.raw === "string" ? data.raw : "")
}

function cookieGet(name: string) {
  try {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[-.]/g, "\\$&") + "=([^;]*)"))
    return m ? decodeURIComponent(m[1]) : ""
  } catch { return "" }
}

function cookieSet(name: string, value: string, days = 30) {
  const max = value ? `max-age=${days * 86400}` : "max-age=0"
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; ${max}; samesite=lax`
}

function persist(token: string, email: string, customer?: any) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (email) localStorage.setItem(EMAIL_KEY, email)
  if (customer) localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer))
  if (token) cookieSet("toonhub_token", token)
  if (email) cookieSet("toonhub_email", email)
  cookieSet("toonhub_signed_in", "1")
  document.documentElement.classList.add("has-account")
  document.querySelector(".account-page")?.classList.add("is-in")
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
  localStorage.removeItem(CUSTOMER_KEY)
  cookieSet("toonhub_token", "")
  cookieSet("toonhub_email", "")
  cookieSet("toonhub_signed_in", "")
  document.documentElement.classList.remove("has-account")
  document.querySelector(".account-page")?.classList.remove("is-in")
  fetch("/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "logout" }),
  }).catch(() => {})
}

function sessionToken() {
  return localStorage.getItem(TOKEN_KEY) || cookieGet("toonhub_token") || ""
}

function sessionEmail() {
  return localStorage.getItem(EMAIL_KEY) || cookieGet("toonhub_email") || ""
}

function cachedCustomer() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "null") } catch { return null }
}

async function postJson(url: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  const text = await res.text()
  let data: any = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  return { ok: res.ok, status: res.status, data }
}

function showError(msg: string) {
  loginError.hidden = false
  loginError.style.display = "block"
  loginError.textContent = msg
}

function setMode(next: string) {
  mode = next
  document.querySelectorAll(".account-tab").forEach((t) => t.classList.toggle("is-on", t.getAttribute("data-mode") === mode))
  const isReg = mode === "register"
  names.hidden = !isReg
  names.style.display = isReg ? "grid" : "none"
  pass2.hidden = !isReg
  pass2.required = isReg
  title.textContent = isReg ? "Create account" : "Login"
  sub.textContent = isReg
    ? "Create your Toonhub account to track orders and member benefits."
    : "Sign in to access your orders and member benefits."
  loginBtn.textContent = isReg ? "Create account" : "Sign in"
  history.replaceState(null, "", isReg ? "/account?mode=register" : "/account")
}

document.querySelectorAll(".account-tab").forEach((t) => {
  t.addEventListener("click", () => setMode(t.getAttribute("data-mode") || "login"))
})
setMode(mode)

function money(n: number, code = "usd") {
  try {
    if ((window as any).toonhub?.formatMoney) return (window as any).toonhub.formatMoney(n, code)
    return new Intl.NumberFormat("en-US", { style: "currency", currency: (code || "usd").toUpperCase() }).format((n || 0) / 100)
  } catch {
    return `$${((n || 0) / 100).toFixed(2)}`
  }
}

function displayName(c: any, email: string) {
  const n = [c?.first_name, c?.last_name].filter(Boolean).join(" ").trim()
  return n || email.split("@")[0] || "collector"
}

const HIDDEN_ORDERS_KEY = "toonhub_hidden_orders";

function hiddenOrderIds(): Set<string> {
  try {
    const arr = JSON.parse(localStorage.getItem(HIDDEN_ORDERS_KEY) || "[]");
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function hideOrderId(id: string) {
  const set = hiddenOrderIds();
  set.add(id);
  try { localStorage.setItem(HIDDEN_ORDERS_KEY, JSON.stringify([...set])); } catch {}
}

function removeLocalOrder(id: string) {
  try {
    const orders = JSON.parse(localStorage.getItem("toonhub_orders") || "[]");
    localStorage.setItem(
      "toonhub_orders",
      JSON.stringify(orders.filter((o: any) => String(o.display_id || o.id) !== id)),
    );
  } catch {}
  try {
    const cached = JSON.parse(localStorage.getItem("toonhub_account_orders") || "[]");
    localStorage.setItem(
      "toonhub_account_orders",
      JSON.stringify(cached.filter((o: any) => String(o.display_id || o.id) !== id)),
    );
  } catch {}
}

/** 删除订单历史记录(带确认防误删):已付款订单仅从本地历史隐藏,未付款快照真正移除 */
async function deleteOrderEntry(id: string) {
  if (!confirm("Delete this order from your history? Your order itself is not affected.")) return;
  const isRemote = (lastRemote || []).some(
    (o) => String(o.display_id || o.id) === id,
  );
  if (isRemote) hideOrderId(id);
  else removeLocalOrder(id);
  renderOrders(lastRemote, lastEmail);
}

function localOrders(email: string) {
  const out: any[] = []
  try {
    const cached = JSON.parse(localStorage.getItem("toonhub_account_orders") || "[]")
    if (Array.isArray(cached)) out.push(...cached)
  } catch {}
  try {
    const all = JSON.parse(localStorage.getItem("toonhub_orders") || "[]")
    if (Array.isArray(all)) {
      out.push(...all.filter((o: any) => !email || !o.email || String(o.email).toLowerCase() === email.toLowerCase()))
    }
  } catch {}
  return out
}

function savedCheckout() {
  try { return JSON.parse(localStorage.getItem("toonhub_checkout") || "null") } catch { return null }
}

function formatAddr(a: AddressLike | string | null | undefined): string {
  if (!a) return ""
  if (typeof a === "string") return a
  const lines = [
    [a.first_name, a.last_name].filter(Boolean).join(" ") || a.name,
    a.address_1 || a.address || a.street,
    a.address_2 || a.apartment,
    [a.city, a.province || a.province_code || a.state, a.postal_code || a.postal].filter(Boolean).join(", "),
    a.country_code || a.country,
    a.phone,
  ].filter(Boolean)
  return lines.join("\n")
}

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  const text = String(err ?? "").trim()
  return text || fallback
}

let lastAddresses: AddressLike[] = []
/** 当前正在编辑的地址 id:""=无,"new"=新增表单,其余=对应地址 */
let editingAddressId = ""

const INP = "width:100%;padding:9px 11px;border:1px solid var(--co-border,#333);border-radius:6px;background:#141414;color:#eee;font-size:.9rem;box-sizing:border-box;"
const BTN = "padding:6px 14px;border:1px solid var(--co-border,#333);border-radius:6px;background:#1b1b1b;color:#eee;cursor:pointer;font-size:.82rem;"

function addrFormHtml(a: AddressLike | null): string {
  const v = (k: string) => esc((a as Record<string, unknown> | null)?.[k] ?? "")
  return `<form data-addr-form style="display:grid;gap:8px;margin-top:10px;padding:14px;border:1px solid var(--co-border,#333);border-radius:8px;background:#121212;">
    <div style="display:flex;gap:8px;">
      <input name="first_name" placeholder="First name" value="${v("first_name")}" style="${INP}">
      <input name="last_name" placeholder="Last name" value="${v("last_name")}" style="${INP}">
    </div>
    <input name="address_1" placeholder="Address" value="${v("address_1")}" style="${INP}" required>
    <input name="city" placeholder="City" value="${v("city")}" style="${INP}" required>
    <div style="display:flex;gap:8px;">
      <input name="province" placeholder="Province / State" value="${v("province")}" style="${INP}">
      <input name="postal_code" placeholder="Postal / ZIP" value="${v("postal_code")}" style="${INP}" required>
    </div>
    <div style="display:flex;gap:8px;">
      <input name="country_code" placeholder="Country code (e.g. US)" value="${v("country_code")}" style="${INP}" required>
      <input name="phone" placeholder="Phone" value="${v("phone")}" style="${INP}">
    </div>
    <div style="display:flex;gap:8px;">
      <button type="submit" style="${BTN}">Save address</button>
      <button type="button" data-addr-cancel style="${BTN}">Cancel</button>
    </div>
  </form>`
}

async function refreshDashboard() {
  const token = sessionToken()
  const extra = token ? await loadAccount(token).catch(() => null) : null
  if (extra?.ok && extra.data?.customer) {
    renderDashboard({
      email: extra.data.customer.email || sessionEmail(),
      customer: extra.data.customer,
      orders: extra.data.orders,
      addresses: extra.data.addresses,
    })
    return true
  }
  return false
}

async function deleteAddress(id: string) {
  if (!confirm("Delete this address?")) return
  try {
    const token = sessionToken()
    const res = await postJson(
      "/api/account",
      { action: "address-delete", id },
      token ? { Authorization: `Bearer ${token}` } : {},
    )
    if (!res.ok) throw new Error(res.data?.error || "Could not delete address")
    const ok = await refreshDashboard()
    if (!ok) renderAddresses(lastAddresses.filter((a) => String(a.id) !== id))
  } catch (e) {
    showError(errMessage(e, "Could not delete address"))
  }
}

async function saveAddressForm(form: HTMLFormElement) {
  const fd = new FormData(form)
  const address: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (String(v).trim()) address[k] = String(v).trim()
  if (!address.address_1 || !address.city || !address.postal_code || !address.country_code) {
    showError("Address, city, postal code and country are required")
    return
  }
  try {
    const token = sessionToken()
    const isNew = editingAddressId === "new"
    const res = await postJson(
      "/api/account",
      { action: isNew ? "address-add" : "address-update", id: isNew ? undefined : editingAddressId, address },
      token ? { Authorization: `Bearer ${token}` } : {},
    )
    if (!res.ok) throw new Error(res.data?.error || "Could not save address")
    editingAddressId = ""
    const ok = await refreshDashboard()
    if (!ok) renderAddresses(lastAddresses)
  } catch (e) {
    showError(errMessage(e, "Could not save address"))
  }
}

function renderAddresses(addresses: AddressLike[]) {
  const box = document.getElementById("accountAddresses")!
  lastAddresses = Array.isArray(addresses) ? addresses.filter(Boolean) : []
  const cards = lastAddresses.map((a, i) => {
    const id = String(a.id ?? a.address_id ?? i)
    const form = editingAddressId === id ? addrFormHtml(a) : ""
    return `<div class="account-addr" style="border:1px solid var(--co-border,#333);border-radius:8px;padding:12px 14px;margin-bottom:10px;">
      ${esc(formatAddr(a)).replace(/\n/g, "<br>")}
      <div style="margin-top:10px;display:flex;gap:8px;">
        <button type="button" data-addr-edit="${esc(id)}" style="${BTN}">Edit</button>
        <button type="button" data-addr-del="${esc(id)}" style="${BTN}">Delete</button>
      </div>${form}
    </div>`
  })
  const addArea =
    editingAddressId === "new"
      ? addrFormHtml(null)
      : `<button type="button" data-addr-add style="${BTN}">+ Add address</button>`
  if (!lastAddresses.length && !editingAddressId) {
    box.innerHTML = `<p class="account-muted">No saved address yet.</p>${addArea}`
  } else {
    box.innerHTML = cards.join("") + addArea
  }
  box.querySelectorAll("[data-addr-edit]").forEach((b) => {
    b.addEventListener("click", () => {
      editingAddressId = b.getAttribute("data-addr-edit") || ""
      renderAddresses(lastAddresses)
    })
  })
  box.querySelectorAll("[data-addr-del]").forEach((b) => {
    b.addEventListener("click", () => void deleteAddress(b.getAttribute("data-addr-del") || ""))
  })
  box.querySelectorAll("[data-addr-add]").forEach((b) => {
    b.addEventListener("click", () => {
      editingAddressId = "new"
      renderAddresses(lastAddresses)
    })
  })
  box.querySelectorAll("[data-addr-cancel]").forEach((b) => {
    b.addEventListener("click", () => {
      editingAddressId = ""
      renderAddresses(lastAddresses)
    })
  })
  box.querySelectorAll("[data-addr-form]").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault()
      void saveAddressForm(f as HTMLFormElement)
    })
  })
}

let orderRows: OrderLike[] = []
let lastRemote: OrderLike[] = []
let lastEmail = ""
let orderPage = 1
const ORDER_PAGE_SIZE = 5

function orderRowHtml(o: OrderLike, email: string, paid: boolean): string {
  const id = String(o.display_id || o.id || "Order")
  const when = o.created_at || o.created
  const date = when ? new Date(when).toLocaleDateString() : ""
  const status = o.status || o.fulfillment_status || "placed"
  const total = Number(o.total ?? o.summary?.total ?? 0)
  const cur = o.currency_code || o.currency || "usd"
  const items = o.items || o.line_items || []
  const titles = items.map((i) => i.title).filter(Boolean).slice(0, 3).join(", ")
  const mail = o.email || email
  // 点击订单名称:已付款订单 → 订单详情/确认页;未付款(本地快照)订单 → 结账页继续付款
  const idHref = paid
    ? `/checkout/success?order=${encodeURIComponent(id)}&email=${encodeURIComponent(mail || "")}`
    : `/checkout`
  const tracks = ([] as (TrackingLike | string)[])
    .concat(o.tracking || o.tracking_numbers || [])
    .map((t): TrackingLike | null => {
      if (!t) return null
      if (typeof t === "string") return { tracking_number: t, url: `https://t.17track.net/en#nums=${encodeURIComponent(t)}`, carrier: "Carrier" }
      const num = t.tracking_number || t.number || ""
      const href = t.url || t.tracking_url || (num ? `https://t.17track.net/en#nums=${encodeURIComponent(num)}` : "")
      if (!num && !href) return null
      return { tracking_number: num, url: href, carrier: t.carrier || "Carrier" }
    }).filter(Boolean)
  const trackBtns = tracks.length
    ? tracks
        .map(
          (t) =>
            `<a href="${esc(t?.url)}" target="_blank" rel="noopener noreferrer">${esc(t?.carrier)}${
              t?.tracking_number ? " · " + esc(t.tracking_number) : " track"
            }</a>`,
        )
        .join("")
    : `<span class="meta">Tracking appears here after the parcel ships.</span>`
  const lookup = `/track-order?order=${encodeURIComponent(id)}&email=${encodeURIComponent(mail || "")}`
  return `<div class="account-order">
    <div>
      <b><a href="${idHref}" style="color:#fff;text-decoration:underline;">#${esc(id)}</a></b>${paid ? "" : ` <span class="meta">(unpaid — pay now)</span>`}
      <div class="meta">${esc([date, status].filter(Boolean).join(" · "))}${titles ? `<br>${esc(titles)}` : ""}</div>
      <div class="account-track">
        ${trackBtns}
        <a href="${lookup}">Track this order</a>
        <button type="button" data-order-del="${esc(id)}" style="background:none;border:0;color:#888;cursor:pointer;text-decoration:underline;font-size:.78rem;padding:0;margin-left:10px;">Delete</button>
      </div>
    </div>
    <div class="amt">${total ? money(total, cur) : ""}</div>
  </div>`
}

function renderOrders(remote: OrderLike[], email: string) {
  const box = document.getElementById("accountOrders")!
  const local = localOrders(email)
  const seen = new Set<string>()
  const remoteIds = new Set<string>((remote || []).map((o) => String(o.display_id || o.id || "")))
  const hidden = hiddenOrderIds()
  orderRows = []
  for (const o of [...(remote || []), ...local]) {
    const id = String(o.display_id || o.id || "")
    if (id && seen.has(id)) continue
    if (id && hidden.has(id)) continue
    if (id) seen.add(id)
    orderRows.push(o)
  }
  if (!orderRows.length) {
    box.innerHTML = `<p class="account-muted">You haven’t placed an order yet. <a href="/collections" style="text-decoration:underline;color:#fff;">Browse figures</a></p>`
    return
  }
  lastRemote = remote || []
  lastEmail = email
  const totalPages = Math.max(1, Math.ceil(orderRows.length / ORDER_PAGE_SIZE))
  if (orderPage > totalPages) orderPage = totalPages
  const pageRows = orderRows.slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE)
  const pager =
    totalPages > 1
      ? `<div class="account-pager" style="display:flex;align-items:center;gap:12px;margin-top:14px;justify-content:center;">
          <button type="button" data-pg="prev" ${orderPage <= 1 ? "disabled" : ""} style="padding:6px 14px;border:1px solid var(--co-border,#333);border-radius:6px;background:#141414;color:#eee;cursor:pointer;">← Prev</button>
          <span style="color:#999;font-size:.85rem;">${orderPage} / ${totalPages}</span>
          <button type="button" data-pg="next" ${orderPage >= totalPages ? "disabled" : ""} style="padding:6px 14px;border:1px solid var(--co-border,#333);border-radius:6px;background:#141414;color:#eee;cursor:pointer;">Next →</button>
        </div>`
      : ""
  box.innerHTML = pageRows
    .map((o) => orderRowHtml(o, email, remoteIds.has(String(o.display_id || o.id || ""))))
    .join("") + pager
  box.querySelectorAll("[data-pg]").forEach((b) => {
    b.addEventListener("click", () => {
      orderPage += b.getAttribute("data-pg") === "prev" ? -1 : 1
      renderOrders(lastRemote, lastEmail)
    })
  })
  box.querySelectorAll("[data-order-del]").forEach((b) => {
    b.addEventListener("click", () => {
      void deleteOrderEntry(b.getAttribute("data-order-del") || "")
    })
  })
}

function fillProfile(customer: any, email: string) {
  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ").trim()
  document.getElementById("accountHello")!.textContent = `Welcome back, ${displayName(customer, email)}`
  document.getElementById("infoName")!.textContent = name || "—"
  document.getElementById("infoEmail")!.textContent = customer?.email || email
  document.getElementById("infoPhone")!.textContent = customer?.phone || "—"
  ;(document.getElementById("editFirst") as HTMLInputElement).value = customer?.first_name || ""
  ;(document.getElementById("editLast") as HTMLInputElement).value = customer?.last_name || ""
  ;(document.getElementById("editPhone") as HTMLInputElement).value = customer?.phone || ""
}

function showHome() {
  guest.hidden = true
  home.hidden = false
  document.documentElement.classList.add("has-account")
  document.querySelector(".account-page")?.classList.add("is-in")
}

function showGuest() {
  guest.hidden = false
  home.hidden = true
  document.documentElement.classList.remove("has-account")
}

function renderDashboard(opts: { email: string; customer?: any; orders?: any[]; addresses?: any[] }) {
  showHome()
  fillProfile(opts.customer || {}, opts.email)
  renderAddresses(opts.addresses || opts.customer?.addresses || [])
  if (opts.orders && opts.orders.length) {
    try { localStorage.setItem("toonhub_account_orders", JSON.stringify(opts.orders)) } catch {}
  }
  renderOrders(opts.orders || [], opts.email)
}

async function authViaApi(payload: any) {
  const res = await postJson("/api/auth/login", payload)
  if (!res.ok || !tokenOf(res.data)) throw new Error(res.data.error || "Invalid email or password")
  return { token: tokenOf(res.data), email: payload.email, customer: res.data.customer }
}

async function loadAccount(token: string) {
  const res = await fetch("/api/account", {
    credentials: "same-origin",
    headers: { accept: "application/json", Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, data }
}

async function boot() {
  const token = sessionToken()
  const email = sessionEmail()
  if (!token && !email) return
  if (token && email) persist(token, email, cachedCustomer())
  renderDashboard({ email, customer: cachedCustomer() })
  if (!token) return
  try {
    const res = await loadAccount(token)
    if (res.ok && res.data?.customer) {
      persist(token, res.data.customer.email || email, res.data.customer)
      renderDashboard({
        email: res.data.customer.email || email,
        customer: res.data.customer,
        orders: res.data.orders,
        addresses: res.data.addresses,
      })
    }
  } catch {
    /* keep local session — never bounce back to login */
  }
}

form.onsubmit = async (e) => {
  e.preventDefault()
  const email = (document.getElementById("loginEmail") as HTMLInputElement).value.trim()
  const password = (document.getElementById("loginPassword") as HTMLInputElement).value
  const first_name = (document.getElementById("firstName") as HTMLInputElement).value.trim()
  const last_name = (document.getElementById("lastName") as HTMLInputElement).value.trim()
  loginError.hidden = true
  loginError.style.display = "none"
  if (mode === "register" && password !== pass2.value) {
    showError("Passwords do not match")
    return
  }
  loginBtn.disabled = true
  loginBtn.textContent = "Loading..."
  try {
    const result = await authViaApi({ email, password, mode, first_name, last_name })
    persist(result.token, result.email, result.customer || { email, first_name, last_name })
    renderDashboard({ email: result.email, customer: result.customer || { email, first_name, last_name } })
    const extra = await loadAccount(result.token).catch(() => null)
    if (extra?.ok && extra.data?.customer) {
      persist(result.token, extra.data.customer.email || result.email, extra.data.customer)
      renderDashboard({
        email: extra.data.customer.email || result.email,
        customer: extra.data.customer,
        orders: extra.data.orders,
        addresses: extra.data.addresses,
      })
    }
  } catch (err: any) {
    showError(err.message || "Could not sign in. Check your email and password.")
  }
  loginBtn.disabled = false
  loginBtn.textContent = mode === "register" ? "Create account" : "Sign in"
}

document.getElementById("logoutBtn")!.onclick = () => {
  clearSession()
  location.href = "/account"
}

const profileForm = document.getElementById("profileForm") as HTMLFormElement
const editBtn = document.getElementById("editProfileBtn") as HTMLButtonElement
editBtn.onclick = () => {
  profileForm.hidden = false
  editBtn.hidden = true
}
document.getElementById("profileCancel")!.onclick = () => {
  profileForm.hidden = true
  editBtn.hidden = false
}
profileForm.onsubmit = async (e) => {
  e.preventDefault()
  const token = localStorage.getItem(TOKEN_KEY)
  const err = document.getElementById("profileError")!
  err.hidden = true
  if (!token) return
  const btn = document.getElementById("profileSave") as HTMLButtonElement
  btn.disabled = true
  try {
    const res = await postJson("/api/account", {
      first_name: (document.getElementById("editFirst") as HTMLInputElement).value.trim(),
      last_name: (document.getElementById("editLast") as HTMLInputElement).value.trim(),
      phone: (document.getElementById("editPhone") as HTMLInputElement).value.trim(),
    }, { Authorization: `Bearer ${token}` })
    if (!res.ok) throw new Error(res.data.error || "Could not save")
    const email = localStorage.getItem(EMAIL_KEY) || res.data.customer?.email || ""
    persist(token, email, res.data.customer)
    fillProfile(res.data.customer, email)
    profileForm.hidden = true
    editBtn.hidden = false
  } catch (ex: any) {
    err.hidden = false
    err.textContent = ex.message || "Could not save profile"
  }
  btn.disabled = false
}

document.getElementById("parcelForm")?.addEventListener("submit", (e) => {
  e.preventDefault()
  const num = (document.getElementById("parcelNo") as HTMLInputElement).value.trim()
  if (!num) {
    location.href = "/track-order"
    return
  }
  window.open(`https://t.17track.net/en#nums=${encodeURIComponent(num)}`, "_blank", "noopener")
})

boot()
