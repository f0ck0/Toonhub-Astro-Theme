import { medusaGet } from "./medusa-client"

function shopCategories(categories: any[]) {
  const parentCats = categories.filter((c) => !c.parent_category_id)
  const childMap: Record<string, any[]> = {}
  for (const c of categories) {
    if (c.parent_category_id) {
      if (!childMap[c.parent_category_id]) childMap[c.parent_category_id] = []
      childMap[c.parent_category_id].push(c)
    }
  }
  const figures = categories.find((c) => /^figures?$/i.test(String(c.handle || "")) || /^figures?$/i.test(String(c.name || "")))
  let list: any[] = []
  if (figures && childMap[figures.id]?.length) list = childMap[figures.id]
  else {
    const leaves = categories.filter((c) => c.parent_category_id)
    list = leaves.length ? leaves : parentCats.length ? parentCats : categories
  }
  return list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }))
}

function groupAz(cats: any[]) {
  const groups: { letter: string; items: any[] }[] = []
  for (const cat of shopCategories(cats)) {
    const letter = String(cat.name || "#").charAt(0).toUpperCase()
    const key = /[A-Z]/.test(letter) ? letter : "#"
    const last = groups[groups.length - 1]
    if (last && last.letter === key) last.items.push(cat)
    else groups.push({ letter: key, items: [cat] })
  }
  return groups
}

function status(msg: string) {
  document.querySelectorAll("[data-hydrate-products]").forEach((el) => {
    if (!el.querySelector(".product-card")) {
      const p = el.querySelector("div")
      if (p) p.textContent = msg
    }
  })
  console.warn("[toonhub catalog]", msg)
}

function money(amount: number | null | undefined) {
  if (amount == null) return ""
  const n = Number(amount)
  const minor = n > 0 && n < 1000 ? Math.round(n * 100) : Math.round(n)
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100)
  } catch {
    return `$${(minor / 100).toFixed(2)}`
  }
}

function productUsdMinor(p: any) {
  const v = p?.variants?.[0]
  const raw = v?.calculated_price?.calculated_amount ?? v?.prices?.[0]?.amount
  if (raw == null) return 0
  const n = Number(typeof raw === "object" ? raw.amount : raw)
  if (!Number.isFinite(n)) return 0
  return n > 0 && n < 1000 ? Math.round(n * 100) : Math.round(n)
}

function productPrice(p: any) {
  const n = productUsdMinor(p)
  return n ? "From " + money(n) : ""
}

function imgOf(p: any) {
  return p?.thumbnail || p?.images?.[0]?.url || ""
}

function hoverOf(p: any, img: string) {
  return (p?.images || []).map((i: any) => i.url || i).find((u: string) => u && u !== img) || ""
}

function esc(s: string) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

function catTile(cat: any, img = "") {
  const src = img || cat.products?.find((p: any) => p.thumbnail)?.thumbnail || ""
  return `<a href="/collections/${esc(cat.handle)}" class="shopby-tile card">
    <div class="shopby-media">${src ? `<img src="${esc(src)}" alt="${esc(cat.name)}" loading="lazy" decoding="async" width="800" height="800" />` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#555;font-family:var(--font-heading);text-transform:uppercase;padding:12px;text-align:center;">${esc(cat.name)}</div>`}</div>
    <div class="shopby-heading"><h3>${esc(cat.name)}</h3></div>
    <p style="margin-top:6px;font-size:0.88rem;color:#999;line-height:1.5;">Shop our exclusive ${esc(cat.name)} figures.</p>
  </a>`
}

function productCard(p: any) {
  const img = imgOf(p)
  const hover = hoverOf(p, img)
  const usd = productUsdMinor(p)
  const price = usd ? "From " + money(usd) : ""
  const cats = (p.categories || []).map((c: any) => c.handle || c.id).filter(Boolean).join(" ")
  return `<article class="product-card card" data-price-usd="${usd}" data-title="${esc(p.title)}" data-cats="${esc(cats)}" data-id="${esc(p.id)}">
    <div class="pc-media">
      <a href="/products/${esc(p.handle)}" aria-label="${esc(p.title)}" style="position:absolute;inset:0;z-index:1;">
        ${img ? `<img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="600" height="600" />` : `<div style="width:100%;height:100%;background:#111;"></div>`}
        ${hover ? `<img class="pc-hover" src="${esc(hover)}" alt="" loading="lazy" decoding="async" width="600" height="600" />` : ""}
      </a>
      <button class="wish-btn" type="button" data-wish data-wish-id="${esc(p.id)}" data-wish-handle="${esc(p.handle)}" data-wish-title="${esc(p.title)}" data-wish-img="${esc(img)}" data-wish-price="${usd}" aria-label="Add to wishlist">♡</button>
      <span class="sale-badge">Sale</span>
      <a class="choose-options" href="/products/${esc(p.handle)}">View</a>
    </div>
    <a href="/products/${esc(p.handle)}" class="pc-info">
      <div class="pc-title">${esc(p.title)}</div>
      <div class="stars" data-review-product="${esc(p.id)}"></div>
      <div class="pc-price-row"><span class="pc-price">${esc(price)}</span></div>
    </a>
  </article>`
}

function fillAz(categories: any[]) {
  const groups = groupAz(categories)
  const html = groups.map((g) => `<div class="az-group"><div class="az-letter">${g.letter}</div>${g.items.map((c) => `<a href="/collections/${esc(c.handle)}">${esc(c.name)}</a>`).join("")}</div>`).join("")
  const desk = document.querySelector(".az-dropdown")
  if (desk && !desk.querySelector("a")) desk.innerHTML = html
  const mobile = document.getElementById("azMobile")
  if (mobile && !mobile.querySelector("a")) {
    mobile.innerHTML = groups.map((g) => `<div class="az-letter" style="padding:8px 8px 2px;">${g.letter}</div>${g.items.map((c) => `<a href="/collections/${esc(c.handle)}" style="padding:8px 8px;font-size:0.85rem;color:#bbb;text-transform:uppercase;letter-spacing:0.04em;">${esc(c.name)}</a>`).join("")}`).join("")
  }
}

function fillCatGrids(categories: any[], products: any[]) {
  const shop = shopCategories(categories)
  const byCat: Record<string, any[]> = {}
  for (const p of products) {
    for (const c of p.categories || []) {
      (byCat[c.id] ||= []).push(p)
      (byCat[c.handle] ||= []).push(p)
    }
  }
  const html = shop.map((c) => catTile(c, imgOf(byCat[c.id]?.[0] || byCat[c.handle]?.[0] || {}))).join("")
  document.querySelectorAll("[data-hydrate-cats]").forEach((el) => {
    if (!el.querySelector(".shopby-tile") && html) el.innerHTML = html
  })
}

function fillProductGrids(products: any[]) {
  document.querySelectorAll("[data-hydrate-products]").forEach((el) => {
    if (el.querySelector(".product-card")) return
    if (!products.length) {
      el.innerHTML = `<div style="text-align:center;padding:60px 0;width:100%;"><h3 style="font-size:20px;font-weight:700;color:#fff;">No products returned from Medusa</h3><p style="color:#888;margin-top:8px;">Check the publishable key is linked to a sales channel that has products.</p></div>`
      return
    }
    el.innerHTML = products.map(productCard).join("")
  })
}

function setupCollectionSort() {
  const sel = document.getElementById("collectionSort") as HTMLSelectElement | null
  const grid = document.getElementById("productGrid")
  if (!sel || !grid) return
  sel.onchange = () => {
    const cards = [...grid.querySelectorAll<HTMLElement>(".product-card")]
    const mode = sel.value
    cards.sort((a, b) => {
      const ta = a.getAttribute("data-title") || ""
      const tb = b.getAttribute("data-title") || ""
      const pa = Number(a.getAttribute("data-price-usd") || 0)
      const pb = Number(b.getAttribute("data-price-usd") || 0)
      if (mode === "az") return ta.localeCompare(tb)
      if (mode === "za") return tb.localeCompare(ta)
      if (mode === "price-asc") return pa - pb
      if (mode === "price-desc") return pb - pa
      return 0
    })
    cards.forEach((c) => grid.appendChild(c))
  }
}

function setupLoadMore(qsBase: URLSearchParams, offset: number, total: number) {
  const wrap = document.getElementById("loadMoreWrap")
  const btn = document.getElementById("loadMoreBtn") as HTMLButtonElement | null
  const statusEl = document.getElementById("loadMoreStatus")
  const grid = document.getElementById("productGrid") || document.querySelector("[data-hydrate-products]")
  if (!wrap || !btn || !grid) return

  let loading = false
  const sync = () => {
    wrap.hidden = offset >= total
    if (statusEl) statusEl.hidden = true
    btn.hidden = offset >= total
    btn.disabled = false
    btn.textContent = "Load more"
  }
  sync()

  async function next() {
    if (loading || offset >= total) return
    loading = true
    btn.hidden = true
    if (statusEl) {
      statusEl.hidden = false
      statusEl.innerHTML = `<div class="spinner"></div><span>Loading next page…</span>`
    }
    try {
      const qs = new URLSearchParams(qsBase)
      qs.set("offset", String(offset))
      qs.set("limit", "24")
      const data = await medusaGet(`/store/products?${qs}`)
      const list = data.products || []
      if (list.length) {
        grid!.insertAdjacentHTML("beforeend", list.map(productCard).join(""))
        document.dispatchEvent(new Event("toonhub:catalog"))
      }
      offset += list.length
      total = Number(data.count ?? total) || total
      const countEl = document.querySelector("[data-product-count]")
      if (countEl) countEl.textContent = `${total} products`
      if (!list.length) offset = total
    } catch (e: any) {
      if (statusEl) {
        statusEl.hidden = false
        statusEl.innerHTML = `<span>Could not load the next page. ${e.message || ""}</span>`
      }
      btn.hidden = false
      btn.textContent = "Retry"
      loading = false
      return
    }
    loading = false
    sync()
  }

  btn.onclick = () => next()
  const io = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && !wrap.hidden) next()
  }, { rootMargin: "320px" })
  io.observe(wrap)
}

async function load() {
  status("Loading products from Medusa…")
  try {
    const catsData = await medusaGet("/store/product-categories?limit=200&fields=id,name,handle,parent_category_id,description")
    const categories = catsData.product_categories || catsData.categories || []
    fillAz(categories)

    const handle = document.querySelector("[data-collection-handle]")?.getAttribute("data-collection-handle")
    const special = handle === "new-arrivals"
    const onCollection = Boolean(handle)
    let regionId = ""
    try {
      const regions = await medusaGet("/store/regions?limit=5")
      regionId = regions.regions?.[0]?.id || ""
    } catch { /* optional */ }

    const qs = new URLSearchParams({
      limit: onCollection ? "24" : "48",
      fields: "*variants,*variants.calculated_price,*variants.prices,*images,+thumbnail,*categories,+handle,+title",
    })
    if (regionId) qs.set("region_id", regionId)

    if (handle && !special) {
      const cat = categories.find((c: any) => c.handle === handle)
      const ids = cat ? [cat.id, ...categories.filter((c: any) => c.parent_category_id === cat.id).map((c: any) => c.id)] : []
      if (ids.length) ids.forEach((id) => qs.append("category_id[]", id))
      const titleEl = document.querySelector("[data-collection-title]")
      if (titleEl && cat?.name) titleEl.textContent = `Collection: ${cat.name}`
    }

    const prodData = await medusaGet(`/store/products?${qs}`)
    const products = prodData.products || []
    fillCatGrids(categories, products)
    fillProductGrids(products)
    const total = Number(prodData.count ?? products.length) || products.length
    const countEl = document.querySelector("[data-product-count]")
    if (countEl) countEl.textContent = `${total} products`
    if (onCollection) {
      const existing = document.querySelectorAll("#productGrid .product-card, [data-hydrate-products] .product-card").length
      setupLoadMore(qs, existing || products.length, total)
      setupCollectionSort()
    }
    document.dispatchEvent(new Event("toonhub:catalog"))
  } catch (e: any) {
    status(`Could not load Medusa products: ${e.message || e}. If this is CORS, set STORE_CORS=* (or this preview origin) on the Medusa server.`)
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load)
else load()
