type MedusaCfg = { baseUrl: string; publishableKey: string }

function cfg(): MedusaCfg {
  return (window as any).toonhubMedusa || { baseUrl: "http://96.47.238.191:9000", publishableKey: "" }
}

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

async function medusaGet(path: string): Promise<any> {
  const { baseUrl, publishableKey } = cfg()
  const raw = `${baseUrl.replace(/\/$/, "")}${path}`
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-publishable-api-key": publishableKey,
  }
  const urls: string[] = [
    `/api/medusa-proxy?path=${encodeURIComponent(path)}`,
  ]
  if (typeof location === "undefined" || location.protocol === "http:") urls.push(raw)
  urls.push("https://corsproxy.org/?" + encodeURIComponent(raw))
  urls.push("https://api.allorigins.win/raw?url=" + encodeURIComponent(raw))
  urls.push("https://corsproxy.io/?" + encodeURIComponent(raw))
  urls.push("https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(raw))
  let last = "Medusa request failed"
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
      const text = await res.text()
      let data: any = {}
      try { data = text ? JSON.parse(text) : {} } catch { continue }
      if (data?.error && /unreachable|invalid path/i.test(String(data.error))) { last = data.error; continue }
      if (res.ok && data && !data.type) return data
      last = data.message || data.error || `HTTP ${res.status}`
      if (res.ok) return data
    } catch (e: any) {
      last = e.message || last
    }
  }
  throw new Error(last)
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

function productPrice(p: any) {
  const v = p?.variants?.[0]
  const raw = v?.calculated_price?.calculated_amount ?? v?.prices?.[0]?.amount
  if (raw == null) return ""
  const n = Number(typeof raw === "object" ? raw.amount : raw)
  return "From " + money(n)
}

function imgOf(p: any) {
  return p?.thumbnail || p?.images?.[0]?.url || ""
}

function esc(s: string) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

function catTile(cat: any, img = "") {
  const src = img || cat.products?.find((p: any) => p.thumbnail)?.thumbnail || ""
  const count = cat.products?.length
  return `<a href="/collections/${esc(cat.handle)}" class="shopby-tile card">
    <div class="shopby-media">${src ? `<img src="${esc(src)}" alt="${esc(cat.name)}" loading="lazy" />` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#555;font-family:var(--font-heading);text-transform:uppercase;padding:12px;text-align:center;">${esc(cat.name)}</div>`}</div>
    <div class="shopby-heading"><h3>${esc(cat.name)}</h3></div>
    <p style="margin-top:6px;font-size:0.8rem;color:#999;">Shop our exclusive ${esc(cat.name)} figures.</p>
    ${typeof count === "number" ? `<p style="margin-top:8px;font-size:0.75rem;color:#999;text-transform:uppercase;letter-spacing:0.06em;">${count} products</p>` : ""}
  </a>`
}

function productCard(p: any) {
  const img = imgOf(p)
  const price = productPrice(p)
  return `<article class="product-card card">
    <div class="pc-media">
      <a href="/products/${esc(p.handle)}" aria-label="${esc(p.title)}" style="position:absolute;inset:0;z-index:1;">
        ${img ? `<img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy" />` : `<div style="width:100%;height:100%;background:#111;"></div>`}
      </a>
      <span class="sale-badge">Sale</span>
      <a class="choose-options" href="/products/${esc(p.handle)}">View</a>
    </div>
    <a href="/products/${esc(p.handle)}" class="pc-info">
      <div class="pc-title">${esc(p.title)}</div>
      <div class="pc-price-row"><span class="pc-price">${esc(price)}</span></div>
    </a>
  </article>`
}

function fillAz(categories: any[]) {
  const groups = groupAz(categories)
  const desk = document.querySelector(".az-dropdown")
  if (desk && !desk.querySelector("a")) {
    desk.innerHTML = groups.map((g) => `<div class="az-group"><div class="az-letter">${g.letter}</div>${g.items.map((c) => `<a href="/collections/${esc(c.handle)}">${esc(c.name)}</a>`).join("")}</div>`).join("")
  }
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
    if (!el.querySelector(".shopby-tile")) el.innerHTML = html
  })
}

function fillProductGrids(products: any[]) {
  document.querySelectorAll("[data-hydrate-products]").forEach((el) => {
    if (el.querySelector(".product-card")) return
    if (!products.length) {
      el.innerHTML = `<div style="text-align:center;padding:60px 0;width:100%;"><h3 style="font-size:20px;font-weight:700;color:#fff;">No products in this collection</h3></div>`
      return
    }
    el.innerHTML = products.map(productCard).join("")
  })
}

async function load() {
  const { publishableKey } = cfg()
  if (!publishableKey) return
  try {
    const catsData = await medusaGet("/store/product-categories?limit=200&fields=id,name,handle,parent_category_id,description")
    const categories = catsData.product_categories || catsData.categories || []
    fillAz(categories)

    const handle = document.querySelector("[data-collection-handle]")?.getAttribute("data-collection-handle")
    const special = handle === "new-arrivals"
    let regionId = ""
    try {
      const regions = await medusaGet("/store/regions?limit=5")
      regionId = regions.regions?.[0]?.id || ""
    } catch { /* optional */ }

    const qs = new URLSearchParams({
      limit: "48",
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
    const countEl = document.querySelector("[data-product-count]")
    if (countEl) countEl.textContent = `${prodData.count ?? products.length} products`
  } catch (e) {
    console.error("Medusa catalog", e)
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load)
else load()
