/** Storefront copy & chrome — Toonhub, structured like tsukiyashop.com. */

export const SITE = {
  name: "TOONHUB",
  domain: "toonhubshop.com",
  tagline: "World's Leading Anime Figures Collection",
  description:
    "Shop premium anime figures, statues and collectibles. Free worldwide shipping. Buy 1 get the 2nd half price.",
  email: "hello@toonhubshop.com",
  instagram: "https://instagram.com/",
  tiktok: "https://www.tiktok.com/",
  announcements: [
    "World's Leading Anime Figures Collection",
    "Free Shipping Ends Soon",
  ],
  offer: "Limited Offer: Buy 1 Get 2nd Half Price. World Wide Free Shipping.",
  offerWarn: "PLEASE CHECK YOUR FIGURE EDITION AND SHIPPING ADDRESS AFTER !!!!!",
  marquee:
    "✅ 30-Day Guarantee   🚚 Free Shipping World Wide   🎁 Buy 1 Get Second 50% Off  •  For all figures",
}

export const FIGURES_HANDLE = "figures-100028"

export const COLLECTION_IMAGES: Record<string, string> = {
  "one-piece-100029": "/images/collection/onepiece.webp",
  "dragon-ball-100030": "/images/collection/dragonball.webp",
  "naruto-100031": "/images/collection/solo-leveling.webp",
  "demon-slayer-100032": "/images/collection/demon-slayer.webp",
  "pok-mon-100033": "/images/collection/pokemon.webp",
  "digimon-100034": "/images/collection/gundam.webp",
  "bleach-100035": "/images/collection/bleach.webp",
  "my-hero-academia-100036": "/images/collection/my-hero-acadamia.webp",
  "jujutsu-kaisen-100037": "/images/collection/jujutsu-kaisen.webp",
  "black-clover-100038": "/images/collection/black-clover.webp",
  "tokyo-revengers-100039": "/images/collection/sailor-moon.webp",
  "attack-on-titan-100041": "/images/collection/attack-on-titan.webp",
  "chainsaw-man-100042": "/images/collection/chainsaw-man.webp",
  "tokyo-ghoul-100043": "/images/collection/tokyo-ghoul.webp",
}

/** Deterministic rating + review count so cards look like Judge.me social proof. */
export function productSocial(id = ""): { rating: number; count: number } {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  const rating = Math.round((4.55 + (Math.abs(h) % 46) / 100) * 100) / 100
  const count = 1 + (Math.abs(h >> 3) % 164)
  return { rating, count }
}

export function groupCategories(categories: any[]) {
  const parentCats = categories.filter((c: any) => !c.parent_category_id)
  const childMap: Record<string, any[]> = {}
  for (const c of categories) {
    if (c.parent_category_id) {
      if (!childMap[c.parent_category_id]) childMap[c.parent_category_id] = []
      childMap[c.parent_category_id].push(c)
    }
  }
  for (const k of Object.keys(childMap)) {
    childMap[k].sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }
  return { parentCats, childMap }
}

/**
 * Categories used in Shop All / Anime List.
 * These are Medusa product categories for browsing — not products themselves.
 * Prefer leaf (IP) categories under Figures; otherwise all non-root categories.
 */
export function shopCategories(categories: any[]) {
  const { parentCats, childMap } = groupCategories(categories)
  const figures = categories.find((c: any) => c.handle === FIGURES_HANDLE || /^figures?$/i.test(String(c.handle || "")) || /^figures?$/i.test(String(c.name || "")))
  let list: any[] = []
  if (figures && childMap[figures.id]?.length) list = childMap[figures.id]
  else {
    const leaves = categories.filter((c: any) => c.parent_category_id)
    list = leaves.length ? leaves : parentCats.length ? parentCats : categories
  }
  return list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }))
}

export function groupAz(categories: any[]) {
  const groups: { letter: string; items: any[] }[] = []
  for (const cat of shopCategories(categories)) {
    const letter = String(cat.name || "#").charAt(0).toUpperCase()
    const key = /[A-Z]/.test(letter) ? letter : "#"
    const last = groups[groups.length - 1]
    if (last && last.letter === key) last.items.push(cat)
    else groups.push({ letter: key, items: [cat] })
  }
  return groups
}
