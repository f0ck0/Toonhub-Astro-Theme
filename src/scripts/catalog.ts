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
    <p style="color:#999;">Shop our exclusive ${esc(cat.name)} figures.</p>
  </a>`
}

function productCard(p: any) {
  const img = imgOf(p)
  const hover = hoverOf(p, img)
  const usd = productUsdMinor(p)
  const sale = usd ? Math.round(usd / 2) : 0
  const price = sale ? `<span class="pc-from">From</span>${esc(money(sale))}` : ""
  const compare = usd ? esc(money(usd)) : ""
  const cats = (p.categories || []).map((c: any) => c.handle || c.id).filter(Boolean).join(" ")
  const variants = (p.variants || []).map((v: any) => ({
    id: v.id,
    title: v.title || (v.options || []).map((o: any) => o.value).join(" / ") || "Default",
  })).filter((v: any) => v.id)
  const qv = encodeURIComponent(JSON.stringify({
    variantId: variants[0]?.id || "",
    title: p.title,
    thumbnail: img,
    handle: p.handle,
    unit_price: usd,
    variant_title: variants[0]?.title,
    variants,
  }))
  const hasOptions = variants.length > 1
  const cta = variants.length
    ? `<button class="choose-options" type="button" data-action="quickview">${hasOptions ? "Choose options" : "Add to cart"}</button>`
    : `<a class="choose-options" href="/products/${esc(p.handle)}">View</a>`
  return `<article class="product-card card" data-qv="${qv}" data-price-usd="${usd}" data-title="${esc(p.title)}" data-cats="${esc(cats)}" data-id="${esc(p.id)}">
    <div class="pc-media">
      <a href="/products/${esc(p.handle)}" aria-label="${esc(p.title)}" style="position:absolute;inset:0;z-index:1;">
        ${img ? `<img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="600" height="600" />` : `<div style="width:100%;height:100%;background:#111;"></div>`}
        ${hover ? `<img class="pc-hover" src="${esc(hover)}" alt="" loading="lazy" decoding="async" width="600" height="600" />` : ""}
      </a>
      <button class="wish-btn" type="button" data-wish data-wish-id="${esc(p.id)}" data-wish-handle="${esc(p.handle)}" data-wish-title="${esc(p.title)}" data-wish-img="${esc(img)}" data-wish-price="${usd}" aria-label="Add to wishlist">♡</button>
      <span class="sale-badge">Sale</span>
      ${cta}
    </div>
    <a href="/products/${esc(p.handle)}" class="pc-info">
      <div class="pc-title" style="font-family:'Asul',Georgia,serif;font-weight:400;font-style:normal;text-transform:none;letter-spacing:0.03em;">${esc(p.title || p.handle || "")}</div>
      <div class="stars" data-review-product="${esc(p.id)}"></div>
      ${price ? `<div class="pc-price-row"><span class="pc-price product-card-price" style="font-family:'Quattrocento Sans',Arial,sans-serif;font-weight:400;font-style:italic;">${price}</span>${compare ? `<span class="pc-compare" data-price-strike style="font-family:'Quattrocento Sans',Arial,sans-serif;font-style:italic;font-weight:400;">${compare}</span>` : ""}</div>` : ""}
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

function cardMissingTitleOrPrice(el: Element) {
  const title = (el.querySelector(".pc-title")?.textContent || "").trim()
  const price = Number(el.getAttribute("data-price-usd") || 0)
  return !title || !price
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function mixAcrossCategories(products: any[], take = 24) {
  const byCat: Record<string, any[]> = {}
  for (const p of products) {
    const keys = (p.categories || []).map((c: any) => c.id || c.handle).filter(Boolean)
    if (!keys.length) keys.push("_")
    for (const k of keys) (byCat[k] ||= []).push(p)
  }
  const cats = shuffle(Object.keys(byCat))
  const out: any[] = []
  const seen = new Set<string>()
  for (let pass = 0; pass < 3; pass++) {
    for (const k of cats) {
      const p = shuffle(byCat[k] || []).find((x) => x?.id && !seen.has(x.id))
      if (!p) continue
      seen.add(p.id)
      out.push(p)
      if (out.length >= take) return shuffle(out)
    }
  }
  return shuffle(out).slice(0, take)
}

async function mixHomeFromCategories(categories: any[], regionId: string) {
  const shop = shuffle(shopCategories(categories)).slice(0, 12)
  if (!shop.length) return [] as any[]
  const fields = "+id,+title,+handle,+thumbnail,*variants,*variants.calculated_price,*variants.prices,*images,*categories"
  const batches = await Promise.all(shop.map(async (c) => {
    try {
      const qs = new URLSearchParams({ limit: "4", fields })
      if (regionId) qs.set("region_id", regionId)
      qs.append("category_id[]", c.id)
      const data = await medusaGet(`/store/products?${qs}`)
      return data.products || []
    } catch {
      return []
    }
  }))
  const out: any[] = []
  const seen = new Set<string>()
  for (let pass = 0; pass < 2; pass++) {
    for (const list of batches) {
      const p = shuffle(list).find((x: any) => x?.id && !seen.has(x.id) && (x.title || x.handle))
      if (!p) continue
      seen.add(p.id)
      out.push(p)
      if (out.length >= 24) return shuffle(out)
    }
  }
  return shuffle(out)
}

function homeNeedsHydrate(el: Element) {
  const cards = [...el.querySelectorAll(".product-card")]
  if (!cards.length) return true
  return cards.filter(cardMissingTitleOrPrice).length >= Math.ceil(cards.length / 2)
}

function fillProductGrids(products: any[]) {
  document.querySelectorAll("[data-hydrate-products]").forEach((el) => {
    const home = el.getAttribute("data-hydrate-products") === "home"
    const cards = [...el.querySelectorAll(".product-card")]
    if (cards.length && !(home && homeNeedsHydrate(el))) return
    if (!products.length) {
      if (!cards.length) {
        el.innerHTML = `<div style="text-align:center;padding:60px 0;width:100%;"><h3 style="font-size:20px;font-weight:700;color:#fff;">No products returned from Medusa</h3><p style="color:#888;margin-top:8px;">Check the publishable key is linked to a sales channel that has products.</p></div>`
      }
      return
    }
    const list = home ? mixAcrossCategories(products, 24) : products
    el.innerHTML = list.map(productCard).join("")
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

function setupInfiniteProducts(handle: string) {
  const wrap = document.getElementById("loadMoreWrap") as HTMLElement | null
  const btn = document.getElementById("loadMoreBtn") as HTMLButtonElement | null
  const statusEl = document.getElementById("loadMoreStatus")
  const grid = document.getElementById("productGrid")
  const sentinel = document.getElementById("loadMoreSentinel") || wrap
  if (!wrap || !btn || !grid || wrap.dataset.bound) return
  wrap.dataset.bound = "1"

  const PAGE = 24
  let loading = false
  let done = false
  let catIds: string[] | null = null
  let regionId = ""

  function finish() {
    done = true
    wrap.hidden = true
  }

  function busy(on: boolean, err = "") {
    wrap.hidden = false
    loading = on
    if (statusEl) {
      statusEl.hidden = !on && !err
      if (on) statusEl.innerHTML = `<div class="spinner"></div><span>Loading next page…</span>`
      else if (err) statusEl.innerHTML = `<span>${err}</span>`
    }
    btn.hidden = on || done
    btn.disabled = on
    btn.textContent = err ? "Retry" : "Load more"
  }

  async function resolveFilters() {
    if (catIds) return
    catIds = []
    try {
      const regions = await medusaGet("/store/regions?limit=5")
      regionId = regions.regions?.[0]?.id || ""
    } catch { /* optional */ }
    if (!handle || handle === "new-arrivals") return
    try {
      const catsData = await medusaGet("/store/product-categories?limit=200&fields=id,name,handle,parent_category_id")
      const categories = catsData.product_categories || catsData.categories || []
      const cat = categories.find((c: any) => c.handle === handle)
      if (cat) catIds = [cat.id, ...categories.filter((c: any) => c.parent_category_id === cat.id).map((c: any) => c.id)]
    } catch { /* unfiltered page */ }
  }

  function stillInView() {
    const el = sentinel as HTMLElement
    return el.getBoundingClientRect().top < window.innerHeight + 900
  }

  async function next() {
    if (loading || done) return
    busy(true)
    try {
      await resolveFilters()
      const offset = grid.querySelectorAll(".product-card").length
      const qs = new URLSearchParams({
        limit: String(PAGE),
        offset: String(offset),
        fields: "*variants,*variants.calculated_price,*variants.prices,*images,+thumbnail,*categories,+handle,+title,+id",
      })
      if (regionId) qs.set("region_id", regionId)
      for (const id of catIds || []) qs.append("category_id[]", id)
      const data = await medusaGet(`/store/products?${qs}`)
      const list: any[] = data.products || []
      const have = new Set([...grid.querySelectorAll("[data-id]")].map((el) => el.getAttribute("data-id") || ""))
      const fresh = list.filter((p) => p?.id && !have.has(p.id))
      if (fresh.length) {
        grid.insertAdjacentHTML("beforeend", fresh.map(productCard).join(""))
        document.dispatchEvent(new Event("toonhub:catalog"))
      }
      const now = grid.querySelectorAll(".product-card").length
      const total = Number(data.count)
      const countEl = document.querySelector("[data-product-count]")
      if (countEl && Number.isFinite(total) && total > 0) countEl.textContent = `${total} products`
      else if (countEl) countEl.textContent = `${now} products`

      // Do not trust Medusa `count` to stop — it is often equal to the page size.
      if (list.length < PAGE) {
        finish()
        return
      }
      if (fresh.length === 0) {
        if (now > offset) {
          busy(false)
          if (stillInView()) queueMicrotask(() => next())
          return
        }
        finish()
        return
      }
      busy(false)
      if (stillInView()) queueMicrotask(() => next())
    } catch (e: any) {
      busy(false, `Could not load the next page. ${e.message || ""}`)
    }
  }

  wrap.hidden = false
  btn.hidden = false
  btn.onclick = () => next()
  const io = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) next()
  }, { root: null, rootMargin: "800px 0px", threshold: 0 })
  io.observe(sentinel!)
}

async function load() {
  const handle = document.querySelector("[data-collection-handle]")?.getAttribute("data-collection-handle") || ""
  if (handle) {
    setupInfiniteProducts(handle)
    setupCollectionSort()
  }

  status("Loading products from Medusa…")
  try {
    const catsData = await medusaGet("/store/product-categories?limit=200&fields=id,name,handle,parent_category_id,description")
    const categories = catsData.product_categories || catsData.categories || []
    fillAz(categories)

    const special = handle === "new-arrivals"
    const onCollection = Boolean(handle)
    let regionId = ""
    try {
      const regions = await medusaGet("/store/regions?limit=5")
      regionId = regions.regions?.[0]?.id || ""
    } catch { /* optional */ }

    const qs = new URLSearchParams({
      limit: onCollection ? "24" : "48",
      fields: "+id,+title,+handle,+thumbnail,*variants,*variants.calculated_price,*variants.prices,*images,*categories",
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
    let products = prodData.products || []

    const homeEl = document.querySelector('[data-hydrate-products="home"]')
    if (homeEl && homeNeedsHydrate(homeEl)) {
      const mixed = await mixHomeFromCategories(categories, regionId)
      if (mixed.length) products = mixed
      else products = mixAcrossCategories(products, 24)
    }

    fillCatGrids(categories, products)
    fillProductGrids(products)
    const total = Number(prodData.count ?? products.length) || products.length
    const countEl = document.querySelector("[data-product-count]")
    if (countEl) countEl.textContent = `${total} products`
    document.dispatchEvent(new Event("toonhub:catalog"))
  } catch (e: any) {
    status(`Could not load Medusa products: ${e.message || e}. If this is CORS, set STORE_CORS=* (or this preview origin) on the Medusa server.`)
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load)
else load()
