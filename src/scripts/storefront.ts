const RATES: Record<string, number> = {
  usd: 1, eur: 0.92, gbp: 0.79, aud: 1.52, cad: 1.37, jpy: 156, cny: 7.25,
}

export type CartItem = {
  id: string
  title: string
  thumbnail?: string
  variant_id?: string
  quantity: number
  unit_price: number
  handle?: string
  variant_title?: string
}

export type AddPayload = {
  variantId: string
  quantity?: number
  title: string
  thumbnail?: string
  handle?: string
  unit_price: number
  variant_title?: string
}

const LOCAL_KEY = "toonhub_local_cart"
const CART_ID_KEY = "cartId"
const ORDERS_KEY = "toonhub_orders"

function getCurrency() {
  try {
    const m = document.cookie.match(/(?:^|; )toonhub_currency=([^;]+)/)
    return (m ? decodeURIComponent(m[1]) : "usd").toLowerCase()
  } catch {
    return "usd"
  }
}

function formatMoney(minor: number, code = getCurrency()) {
  const rate = RATES[code] ?? 1
  const value = (minor * rate) / 100
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code.toUpperCase() }).format(value)
  } catch {
    return `${code.toUpperCase()} ${value.toFixed(2)}`
  }
}

function readLocal(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]")
  } catch {
    return []
  }
}
function writeLocal(items: CartItem[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
}

function bogoDiscount(items: CartItem[]) {
  const units: number[] = []
  for (const it of items) for (let i = 0; i < it.quantity; i++) units.push(it.unit_price)
  units.sort((a, b) => b - a)
  let d = 0
  for (let i = 0; i + 1 < units.length; i += 2) d += Math.round(Math.min(units[i], units[i + 1]) * 0.5)
  return d
}

let items: CartItem[] = []

function subtotal() {
  return items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
}

function setOpen(id: string, open: boolean) {
  document.getElementById(id)?.classList.toggle("open", open)
}

function lockBody() {
  const anyOpen = ["cartDrawer", "mobileNav", "searchModal", "quickView"].some((id) =>
    document.getElementById(id)?.classList.contains("open"),
  )
  document.body.classList.toggle("drawer-open", anyOpen)
}

function openCart(added = false) {
  setOpen("cartDrawer", true)
  setOpen("cartOverlay", true)
  const title = document.getElementById("cartDrawerTitle")
  if (title) title.textContent = added ? "Added — checkout in 1 step" : "Your cart"
  document.getElementById("cartAddedNote")?.classList.toggle("hidden", !added)
  const checkout = document.getElementById("cartCheckout")
  checkout?.classList.toggle("pulse-cta", added)
  lockBody()
  renderCart()
  if (added) {
    setTimeout(() => document.getElementById("cartDrawerFoot")?.scrollIntoView({ block: "nearest" }), 80)
  }
}

function closeCart() {
  setOpen("cartDrawer", false)
  setOpen("cartOverlay", false)
  lockBody()
}

function openSearch() {
  setOpen("searchModal", true)
  lockBody()
  const input = document.getElementById("searchInput") as HTMLInputElement | null
  setTimeout(() => input?.focus(), 50)
}

function closeSearch() {
  setOpen("searchModal", false)
  lockBody()
}

function openNav() {
  setOpen("mobileNav", true)
  setOpen("navOverlay", true)
  lockBody()
}
function closeNav() {
  setOpen("mobileNav", false)
  setOpen("navOverlay", false)
  lockBody()
}

function openQuickView() {
  setOpen("quickView", true)
  lockBody()
}
function closeQuickView() {
  setOpen("quickView", false)
  lockBody()
}

function updateBadge() {
  const count = items.reduce((s, i) => s + i.quantity, 0)
  document.querySelectorAll<HTMLElement>("[data-cart-count]").forEach((el) => {
    el.textContent = String(count)
    el.hidden = count === 0
  })
}

function renderCart() {
  updateBadge()
  const list = document.getElementById("cartDrawerList")
  const empty = document.getElementById("cartDrawerEmpty")
  const foot = document.getElementById("cartDrawerFoot")
  if (!list) return
  if (!items.length) {
    list.innerHTML = ""
    empty?.classList.remove("hidden")
    foot?.classList.add("hidden")
    return
  }
  empty?.classList.add("hidden")
  foot?.classList.remove("hidden")
  const code = getCurrency()
  list.innerHTML = items
    .map((it) => {
      const img = it.thumbnail
        ? `<img src="${it.thumbnail}" alt="">`
        : `<div class="ph"></div>`
      return `<div class="cart-line" data-id="${it.id}">
        <a href="${it.handle ? `/products/${it.handle}` : "#"}">${img}</a>
        <div style="flex:1;min-width:0;">
          <a href="${it.handle ? `/products/${it.handle}` : "#"}" style="font-size:0.88rem;font-weight:700;text-transform:uppercase;display:block;">${escapeHtml(it.title)}</a>
          ${it.variant_title ? `<div style="font-size:0.78rem;color:#888;margin-top:4px;">${escapeHtml(it.variant_title)}</div>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px;">
            <div class="qty-row">
              <button type="button" data-qty="-1" data-id="${it.id}" aria-label="Decrease">−</button>
              <span>${it.quantity}</span>
              <button type="button" data-qty="1" data-id="${it.id}" aria-label="Increase">+</button>
            </div>
            <div style="font-weight:700;font-size:0.9rem;">${formatMoney(it.unit_price * it.quantity, code)}</div>
          </div>
          <button type="button" data-remove="${it.id}" style="margin-top:8px;background:none;border:none;color:#888;font-size:0.78rem;text-decoration:underline;padding:0;">Remove</button>
        </div>
      </div>`
    })
    .join("")

  const sum = subtotal()
  const disc = bogoDiscount(items)
  const total = Math.max(0, sum - disc)
  const subEl = document.getElementById("cartSubtotal")
  const discRow = document.getElementById("cartDiscountRow")
  const discEl = document.getElementById("cartDiscount")
  const totEl = document.getElementById("cartTotal")
  if (subEl) subEl.textContent = formatMoney(sum, code)
  if (totEl) totEl.textContent = formatMoney(total, code)
  if (discRow && discEl) {
    discRow.classList.toggle("hidden", disc <= 0)
    discEl.textContent = `−${formatMoney(disc, code)}`
  }
  const units = items.reduce((s, i) => s + i.quantity, 0)
  const nudge = document.getElementById("cartBogoNudge")
  if (nudge) {
    if (units === 1) {
      nudge.hidden = false
      nudge.textContent = "Add one more figure — the 2nd is 50% off."
    } else if (units > 1 && disc > 0) {
      nudge.hidden = false
      nudge.textContent = `You're saving ${formatMoney(disc, code)} with Buy 1 get 2nd 50% off.`
    } else {
      nudge.hidden = true
    }
  }
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

async function apiGet(): Promise<CartItem[] | null> {
  const cartId = localStorage.getItem(CART_ID_KEY)
  if (!cartId) return null
  const res = await fetch(`/api/cart?cartId=${encodeURIComponent(cartId)}`)
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data.items) ? data.items : []
}

async function ensureCartId() {
  let id = localStorage.getItem(CART_ID_KEY)
  if (id) return id
  const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
  if (!res.ok) return null
  const data = await res.json()
  if (data.cartId) {
    localStorage.setItem(CART_ID_KEY, data.cartId)
    return data.cartId as string
  }
  return null
}

async function refresh() {
  try {
    const remote = await apiGet()
    if (remote && (remote.length || !readLocal().length)) {
      items = remote
    } else {
      items = readLocal()
    }
  } catch {
    items = readLocal()
  }
  renderCart()
}

function addLocal(payload: AddPayload) {
  const local = readLocal()
  const existing = local.find((i) => i.variant_id === payload.variantId)
  const qty = payload.quantity || 1
  if (existing) existing.quantity += qty
  else
    local.push({
      id: `${payload.variantId}-${Date.now()}`,
      title: payload.title,
      thumbnail: payload.thumbnail,
      variant_id: payload.variantId,
      quantity: qty,
      unit_price: payload.unit_price,
      handle: payload.handle,
      variant_title: payload.variant_title,
    })
  writeLocal(local)
  items = local
}

let adding = false

async function addToCart(payload: AddPayload, opts?: { goCheckout?: boolean }) {
  const qty = payload.quantity || 1
  if (opts?.goCheckout) {
    addLocal({ ...payload, quantity: qty })
    renderCart()
    window.location.assign("/checkout")
    return
  }
  if (adding) return
  adding = true
  try {
    try {
      const cartId = await ensureCartId()
      if (cartId) {
        const res = await fetch("/api/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId, variantId: payload.variantId, quantity: qty }),
        })
        if (res.ok) {
          await refresh()
          openCart(true)
          return
        }
      }
    } catch {
      /* fall through */
    }
    addLocal(payload)
    renderCart()
    openCart(true)
  } finally {
    adding = false
  }
}

async function removeItem(itemId: string) {
  try {
    const cartId = localStorage.getItem(CART_ID_KEY)
    if (cartId) {
      const res = await fetch("/api/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId }),
      })
      if (res.ok) {
        await refresh()
        return
      }
    }
  } catch {
    /* local */
  }
  const local = readLocal().filter((i) => i.id !== itemId)
  writeLocal(local)
  items = local
  renderCart()
}

async function changeQty(itemId: string, delta: number) {
  const it = items.find((i) => i.id === itemId)
  if (!it) return
  const next = it.quantity + delta
  if (next <= 0) return removeItem(itemId)
  try {
    const cartId = localStorage.getItem(CART_ID_KEY)
    if (cartId) {
      const res = await fetch("/api/cart/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId, quantity: next }),
      })
      if (res.ok) {
        await refresh()
        return
      }
    }
  } catch {
    /* local */
  }
  const local = readLocal()
  const found = local.find((i) => i.id === itemId)
  if (found) found.quantity = next
  writeLocal(local)
  items = local
  renderCart()
}

function snapshotOrder(email: string) {
  const disc = bogoDiscount(items)
  const order = {
    id: "TH" + Date.now().toString(36).toUpperCase(),
    email,
    created: new Date().toISOString(),
    items: items.map((i) => ({ title: i.title, quantity: i.quantity, unit_price: i.unit_price })),
    total: Math.max(0, subtotal() - disc),
  }
  try {
    const prev = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]")
    prev.unshift(order)
    localStorage.setItem(ORDERS_KEY, JSON.stringify(prev.slice(0, 20)))
  } catch {
    /* ignore */
  }
  return order
}

function clearCart() {
  items = []
  writeLocal([])
  localStorage.removeItem(CART_ID_KEY)
  renderCart()
}

/* ---------- Search ---------- */
let searchTimer: number | undefined
async function runSearch(q: string) {
  const box = document.getElementById("searchResults")
  if (!box) return
  if (!q.trim()) {
    box.innerHTML = `<p style="padding:24px 20px;color:#888;font-size:0.9rem;">Type to search figures, series and more.</p>`
    return
  }
  box.innerHTML = `<p style="padding:24px 20px;color:#888;font-size:0.9rem;">Searching…</p>`
  try {
    let list: any[] = []
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      list = data.products || []
    } catch { /* client Medusa next */ }
    if (!list.length) {
      try {
        const { medusaGet } = await import("./medusa-client")
        const data = await medusaGet(`/store/products?q=${encodeURIComponent(q)}&limit=12&fields=+thumbnail,+handle,+title,*variants,*variants.prices`)
        list = (data.products || []).map((p: any) => ({
          handle: p.handle,
          title: p.title,
          thumbnail: p.thumbnail || p.images?.[0]?.url || "",
          price: "",
        }))
      } catch { /* empty */ }
    }
    if (!list.length) {
      box.innerHTML = `<p style="padding:24px 20px;color:#888;">No results for “${escapeHtml(q)}”.</p>`
      return
    }
    box.innerHTML =
      list
        .slice(0, 8)
        .map(
          (p: any) => `<a class="search-hit" href="/products/${encodeURIComponent(p.handle)}">
            ${p.thumbnail ? `<img src="${p.thumbnail}" alt="">` : `<div class="ph"></div>`}
            <div style="min-width:0;">
              <div style="font-size:0.88rem;font-weight:700;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.title)}</div>
              <div style="font-size:0.8rem;color:#888;margin-top:4px;">${p.price || ""}</div>
            </div>
          </a>`,
        )
        .join("") +
      `<a href="/search?q=${encodeURIComponent(q)}" style="display:block;text-align:center;padding:16px;font-size:0.82rem;letter-spacing:0.08em;text-transform:uppercase;border-top:1px solid var(--color-border);">View all results</a>`
  } catch {
    box.innerHTML = `<p style="padding:24px 20px;color:#888;">Search is unavailable right now.</p>`
  }
}

/* ---------- Quick view ---------- */
function showQuickView(data: AddPayload & { variants?: { id: string; title: string }[] }) {
  const img = document.getElementById("qvImage") as HTMLImageElement | null
  const title = document.getElementById("qvTitle")
  const price = document.getElementById("qvPrice")
  const variants = document.getElementById("qvVariants")
  const addBtn = document.getElementById("qvAdd") as HTMLButtonElement | null
  if (img) {
    img.src = data.thumbnail || ""
    img.alt = data.title
  }
  if (title) title.textContent = data.title
  if (price) price.textContent = "From " + formatMoney(Math.round((data.unit_price || 0) / 2))
  const opts = data.variants && data.variants.length ? data.variants : [{ id: data.variantId, title: data.variant_title || "Default" }]
  if (variants) {
    variants.innerHTML = opts
      .map(
        (v, i) =>
          `<button type="button" class="pdp-size-btn${i === 0 ? " is-on" : ""}" data-vid="${v.id}" data-vtitle="${escapeHtml(v.title)}">${escapeHtml(v.title)}</button>`,
      )
      .join("")
  }
  if (addBtn) {
    addBtn.dataset.variantId = opts[0].id
    addBtn.dataset.title = data.title
    addBtn.dataset.thumbnail = data.thumbnail || ""
    addBtn.dataset.handle = data.handle || ""
    addBtn.dataset.price = String(data.unit_price || 0)
    addBtn.dataset.vtitle = opts[0].title
  }
  const qty = document.getElementById("qvQty")
  if (qty) qty.textContent = "1"
  openQuickView()
}

function parseCard(el: Element): (AddPayload & { variants?: { id: string; title: string }[] }) | null {
  const raw = el.getAttribute("data-qv")
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }
}

function bind() {
  document.getElementById("cartOverlay")?.addEventListener("click", closeCart)
  document.getElementById("navOverlay")?.addEventListener("click", closeNav)
  document.querySelectorAll("[data-open-cart]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault()
      openCart(false)
    }),
  )
  document.querySelectorAll("[data-close-cart]").forEach((el) => el.addEventListener("click", closeCart))
  document.querySelectorAll("[data-open-search]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault()
      openSearch()
    }),
  )
  document.querySelectorAll("[data-close-search]").forEach((el) => el.addEventListener("click", closeSearch))
  document.querySelectorAll("[data-open-nav]").forEach((el) => el.addEventListener("click", openNav))
  document.querySelectorAll("[data-close-nav]").forEach((el) => el.addEventListener("click", closeNav))
  document.querySelectorAll("[data-close-qv]").forEach((el) => el.addEventListener("click", closeQuickView))
  document.getElementById("quickView")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeQuickView()
  })

  document.getElementById("cartDrawerList")?.addEventListener("click", (e) => {
    const t = e.target as HTMLElement
    const rem = t.closest<HTMLElement>("[data-remove]")
    if (rem) removeItem(rem.getAttribute("data-remove") || "")
    const qty = t.closest<HTMLElement>("[data-qty]")
    if (qty) changeQty(qty.getAttribute("data-id") || "", Number(qty.getAttribute("data-qty")))
  })

  /* Checkout is one tap — terms are linked under the button, not a gate. */

  const searchInput = document.getElementById("searchInput") as HTMLInputElement | null
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => runSearch(searchInput.value), 220)
  })
  document.getElementById("searchForm")?.addEventListener("submit", (e) => {
    const q = searchInput?.value?.trim()
    if (!q) e.preventDefault()
  })

  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement
    const qvBtn = t.closest<HTMLElement>("[data-action='quickview']")
    if (qvBtn) {
      e.preventDefault()
      e.stopPropagation()
      const card = qvBtn.closest("[data-qv]") || qvBtn
      const data = parseCard(card)
      if (!data) return
      const variants = data.variants || []
      if (variants.length <= 1) {
        addToCart({ ...data, variantId: data.variantId || variants[0]?.id, quantity: 1 })
      } else {
        showQuickView(data)
      }
      return
    }
    const addBtn = t.closest<HTMLElement>("[data-action='add']")
    if (addBtn) {
      e.preventDefault()
      addToCart({
        variantId: addBtn.dataset.variantId || "",
        title: addBtn.dataset.title || "Figure",
        thumbnail: addBtn.dataset.thumbnail,
        handle: addBtn.dataset.handle,
        unit_price: Number(addBtn.dataset.price || 0),
        variant_title: addBtn.dataset.vtitle,
        quantity: Number(addBtn.dataset.qty || 1),
      })
    }
  })

  document.getElementById("qvVariants")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".pdp-size-btn")
    if (!btn) return
    document.querySelectorAll("#qvVariants .pdp-size-btn").forEach((b) => b.classList.remove("is-on"))
    btn.classList.add("is-on")
    const addBtn = document.getElementById("qvAdd") as HTMLButtonElement | null
    if (addBtn) {
      addBtn.dataset.variantId = btn.dataset.vid
      addBtn.dataset.vtitle = btn.dataset.vtitle
    }
  })
  document.getElementById("qvQtyRow")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-qv-qty]")
    const span = document.getElementById("qvQty")
    if (!btn || !span) return
    const n = Math.max(1, Number(span.textContent || 1) + Number(btn.dataset.qvQty))
    span.textContent = String(n)
    const addBtn = document.getElementById("qvAdd") as HTMLButtonElement | null
    if (addBtn) addBtn.dataset.qty = String(n)
  })

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart()
      closeSearch()
      closeNav()
      closeQuickView()
      document.getElementById("lightbox")?.classList.remove("open")
    }
  })

  /* announcement rotator */
  const msgs = document.querySelectorAll(".announcement-msg")
  if (msgs.length > 1) {
    let i = 0
    setInterval(() => {
      msgs[i].classList.remove("is-active")
      i = (i + 1) % msgs.length
      msgs[i].classList.add("is-active")
    }, 3800)
  }

  /* countdown — rolling 3-day window from first visit */
  const cd = document.getElementById("countdown")
  if (cd) {
    const KEY = "toonhub_sale_end"
    let end = Number(localStorage.getItem(KEY) || 0)
    if (!end || end < Date.now()) {
      end = Date.now() + 3 * 24 * 60 * 60 * 1000
      localStorage.setItem(KEY, String(end))
    }
    const tick = () => {
      const diff = Math.max(0, end - Date.now())
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const set = (id: string, n: number) => {
        const el = document.getElementById(id)
        if (el) el.textContent = String(n).padStart(2, "0")
      }
      set("cdD", d)
      set("cdH", h)
      set("cdM", m)
      set("cdS", s)
    }
    tick()
    setInterval(tick, 1000)
  }

  /* drag sliders */
  document.querySelectorAll<HTMLElement>(".product-drag-slider").forEach((slider) => {
    let isDown = false, startX = 0, startScroll = 0, dragged = false
    slider.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return
      isDown = true
      dragged = false
      startX = e.pageX
      startScroll = slider.scrollLeft
      slider.classList.add("is-dragging")
    })
    slider.addEventListener("mousemove", (e) => {
      if (!isDown) return
      const dx = e.pageX - startX
      if (Math.abs(dx) > 5) dragged = true
      slider.scrollLeft = startScroll - dx
    })
    window.addEventListener("mouseup", () => {
      isDown = false
      slider.classList.remove("is-dragging")
    })
    slider.addEventListener("click", (e) => {
      if (dragged) {
        e.preventDefault()
        e.stopPropagation()
        dragged = false
      }
    }, true)
    slider.addEventListener("dragstart", (e) => e.preventDefault())
    const root = slider.closest("[data-slider]")
    const step = () => {
      const card = slider.querySelector(":scope .slider-track > *") as HTMLElement | null
      return (card ? card.getBoundingClientRect().width : 240) + 16
    }
    root?.querySelector("[data-prev]")?.addEventListener("click", () => slider.scrollBy({ left: -step(), behavior: "smooth" }))
    root?.querySelector("[data-next]")?.addEventListener("click", () => slider.scrollBy({ left: step(), behavior: "smooth" }))
  })

  refresh()
  bindWishlist()
}

const WISH_KEY = "toonhub_wishlist"

function readWish(): any[] {
  try { return JSON.parse(localStorage.getItem(WISH_KEY) || "[]") } catch { return [] }
}
function writeWish(list: any[]) {
  localStorage.setItem(WISH_KEY, JSON.stringify(list))
  syncWishUI()
}
function syncWishUI() {
  const list = readWish()
  const ids = new Set(list.map((i) => i.id))
  document.querySelectorAll<HTMLElement>("[data-wish]").forEach((btn) => {
    const on = ids.has(btn.getAttribute("data-wish-id") || "")
    btn.classList.toggle("is-on", on)
    btn.textContent = on ? "♥" : "♡"
    btn.setAttribute("aria-label", on ? "Remove from wishlist" : "Add to wishlist")
  })
  document.querySelectorAll<HTMLElement>("[data-wish-count]").forEach((el) => {
    el.textContent = String(list.length)
    el.hidden = list.length === 0
  })
}
function bindWishlist() {
  syncWishUI()
  document.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-wish]")
    if (!btn) return
    e.preventDefault()
    e.stopPropagation()
    const id = btn.getAttribute("data-wish-id") || ""
    if (!id) return
    const list = readWish()
    const i = list.findIndex((x) => x.id === id)
    if (i >= 0) list.splice(i, 1)
    else list.unshift({
      id,
      handle: btn.getAttribute("data-wish-handle"),
      title: btn.getAttribute("data-wish-title"),
      thumbnail: btn.getAttribute("data-wish-img"),
      unit_price: Number(btn.getAttribute("data-wish-price") || 0),
    })
    writeWish(list.slice(0, 100))
  })
  document.addEventListener("toonhub:catalog", syncWishUI)
}

declare global {
  interface Window {
    toonhub: {
      addToCart: typeof addToCart
      openCart: typeof openCart
      closeCart: typeof closeCart
      openSearch: typeof openSearch
      refresh: typeof refresh
      snapshotOrder: typeof snapshotOrder
      clearCart: typeof clearCart
      formatMoney: typeof formatMoney
      getCurrency: typeof getCurrency
      getItems: () => CartItem[]
      changeQty: typeof changeQty
      removeItem: typeof removeItem
    }
  }
}

window.toonhub = {
  addToCart,
  openCart,
  closeCart,
  openSearch,
  refresh,
  snapshotOrder,
  clearCart,
  formatMoney,
  getCurrency,
  getItems: () => items,
  changeQty,
  removeItem,
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind)
else bind()
