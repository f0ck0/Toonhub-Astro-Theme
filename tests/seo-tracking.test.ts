import { describe, expect, it } from "vitest"
import { absoluteUrl, breadcrumbJsonLd, metaDescription, stripHtml, withBrand, clamp, DESCRIPTION_MAX } from "../src/lib/seo"
import { buildSitemapEntries, renderSitemapXml, xmlEscape, isoDate, SITEMAP_STATIC_PATHS } from "../src/lib/sitemap"
import { extractTracking, trackLookupUrl, orderTrackStatus } from "../src/lib/tracking"

describe("seo helpers", () => {
  it("withBrand appends the brand suffix exactly once", () => {
    expect(withBrand("About Us")).toBe("About Us — TOONHUB")
    expect(withBrand("About Us — TOONHUB")).toBe("About Us — TOONHUB")
    expect(withBrand("")).toContain("TOONHUB")
  })

  it("metaDescription clamps to SERP length with an ellipsis", () => {
    const long = "word ".repeat(100)
    const out = metaDescription(long)
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(out.endsWith("…")).toBe(true)
    expect(metaDescription("short")).toBe("short")
  })

  it("stripHtml removes tags and entities", () => {
    expect(stripHtml("<p>Hello <b>world</b> &amp; co</p>")).toBe("Hello world & co")
  })

  it("clamp prefers a word boundary", () => {
    const out = clamp("alpha beta gamma delta", 14)
    expect(out).toBe("alpha beta…")
  })

  it("absoluteUrl builds origin-relative URLs and keeps absolute ones", () => {
    expect(absoluteUrl("/products/x", "https://shop.example")).toBe("https://shop.example/products/x")
    expect(absoluteUrl("products/x", "https://shop.example")).toBe("https://shop.example/products/x")
    expect(absoluteUrl("https://cdn.example/a.webp", "https://shop.example")).toBe("https://cdn.example/a.webp")
    expect(absoluteUrl("", "https://shop.example")).toBe("https://shop.example")
  })

  it("breadcrumbJsonLd omits the item URL on the final (current-page) crumb", () => {
    const node = breadcrumbJsonLd(
      [
        { name: "Home", href: "/" },
        { name: "Shop", href: "/collections" },
        { name: "Figure" },
      ],
      "https://shop.example",
    )!
    const items = node.itemListElement as { position: number; name: string; item?: string }[]
    expect(items).toHaveLength(3)
    expect(items[0].item).toBe("https://shop.example/")
    expect(items[2].item).toBeUndefined()
    expect(breadcrumbJsonLd([])).toBeNull()
  })
})

describe("sitemap", () => {
  it("excludes noindex surfaces from the static path list", () => {
    for (const path of SITEMAP_STATIC_PATHS) {
      expect(path).not.toMatch(/account|cart|wishlist|checkout|search/)
    }
  })

  it("enumerates categories, products and published posts with dedupe", () => {
    const entries = buildSitemapEntries({
      staticPaths: ["/", "/about"],
      categories: [{ handle: "one-piece" }, { handle: null }, { handle: "one-piece" }],
      products: [
        { handle: "luffy-figure", updated_at: "2026-08-01T00:00:00Z" },
        { handle: "" },
        { handle: "zoro-figure" },
      ],
      posts: [
        { id: "welcome", draft: false, pubDate: "2026-01-15" },
        { id: "secret-draft", draft: true },
      ],
    })
    const locs = entries.map((e) => e.loc)
    expect(locs).toEqual([
      "/",
      "/about",
      "/collections/one-piece",
      "/products/luffy-figure",
      "/products/zoro-figure",
      "/blog/welcome",
    ])
    expect(entries[3].lastmod).toBe("2026-08-01")
    expect(entries[5].lastmod).toBe("2026-01-15")
  })

  it("xml-escapes user-generated handles", () => {
    expect(xmlEscape(`a&b<c>"'`)).toBe("a&amp;b&lt;c&gt;&quot;&apos;")
    const xml = renderSitemapXml("https://shop.example", [{ loc: "/products/a&b", lastmod: "2026-01-01" }])
    expect(xml).toContain("https://shop.example/products/a&amp;b")
    expect(xml).toContain("<lastmod>2026-01-01</lastmod>")
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  })

  it("strips a trailing slash from the origin", () => {
    expect(renderSitemapXml("https://shop.example/", [{ loc: "/" }])).toContain("https://shop.example/")
    expect(renderSitemapXml("https://shop.example/", [{ loc: "/" }])).not.toContain("example//")
  })

  it("isoDate validates input", () => {
    expect(isoDate("2026-12-31T10:00:00Z")).toBe("2026-12-31")
    expect(isoDate("not a date")).toBeUndefined()
    expect(isoDate(null)).toBeUndefined()
  })
})

describe("tracking", () => {
  it("extracts numbers from legacy and modern fulfillment shapes", () => {
    const items = extractTracking({
      fulfillments: [{ provider_id: "ups_ground", tracking_links: [{ tracking_number: "1Z999" }] }],
      shipping_methods: [{ tracking_numbers: ["YT123", "YT123"] }],
      tracking: ["LP456"],
    })
    const numbers = items.map((i) => i.tracking_number)
    expect(numbers).toEqual(["1Z999", "YT123", "LP456"])
    expect(items[0].carrier).toBe("UPS")
    expect(items[1].carrier).toBe("YunExpress")
  })

  it("prefers a real carrier URL when one exists", () => {
    expect(trackLookupUrl("YT1", "https://carrier.example/t/YT1")).toBe("https://carrier.example/t/YT1")
    expect(trackLookupUrl("YT1")).toBe("https://t.17track.net/en#nums=YT1")
    expect(trackLookupUrl("YT1", "javascript:alert(1)")).toBe("https://t.17track.net/en#nums=YT1")
  })

  it("derives an order status with sane fallbacks", () => {
    expect(orderTrackStatus({ fulfillment_status: "shipped" })).toBe("shipped")
    expect(orderTrackStatus({ status: "completed" })).toBe("completed")
    expect(orderTrackStatus({})).toBe("placed")
    expect(orderTrackStatus(null)).toBe("placed")
  })

  it("handles garbage input without throwing", () => {
    expect(extractTracking(undefined)).toEqual([])
    expect(extractTracking({ fulfillments: [{ labels: [{ tracking_number: " JD77 " }] }] })[0].tracking_number).toBe("JD77")
  })
})
