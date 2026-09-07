/**
 * Image geometry contract.
 *
 * The collection grid used to render visibly soft artwork while the PDP stayed
 * crisp. Root cause was purely declarative: `sizes` understated every card slot
 * (it claimed 220px where the CSS grid renders up to 345px) and the srcset
 * ladder stopped at 660px, so the browser picked a small variant and upscaled
 * it. These tests pin the two invariants that keep that from regressing:
 *
 *  1. every declared `sizes` breakpoint is >= the slot the CSS actually paints;
 *  2. every ladder reaches ~2x its largest slot, so a 2x DPR screen still gets
 *     one image pixel per device pixel.
 *
 * The expected slot widths are derived here from `src/styles/global.css`, so if
 * the grid is re-laid-out the arithmetic below has to be updated with it.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { IMAGE_SIZES, IMAGE_WIDTHS, isPreOptimizedUrl, resolveImageSource } from "../src/lib/images"

/* -------------------------------------------------------------------------- */
/* A very small `sizes` evaluator                                             */
/* -------------------------------------------------------------------------- */

/** Resolve a single CSS length (`345px`, `46vw`, `calc(25vw - 55px)`) to px. */
function lengthToPx(value: string, viewport: number): number {
  const text = value.trim()
  const calc = text.match(/^calc\((.+)\)$/)
  if (calc) {
    // Only the `A <op> B` shape this theme uses needs supporting.
    const parts = calc[1].match(/^(.+?)\s*([+-])\s*(.+)$/)
    if (!parts) return lengthToPx(calc[1], viewport)
    const left = lengthToPx(parts[1], viewport)
    const right = lengthToPx(parts[3], viewport)
    return parts[2] === "+" ? left + right : left - right
  }
  const min = text.match(/^min\((.+)\)$/)
  if (min) {
    return Math.min(...splitTopLevel(min[1]).map((part) => lengthToPx(part, viewport)))
  }
  if (text.endsWith("vw")) return (parseFloat(text) / 100) * viewport
  if (text.endsWith("px")) return parseFloat(text)
  return parseFloat(text)
}

/** Split on top-level commas only — `min(a, b)` must stay in one piece. */
function splitTopLevel(value: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i]
    if (char === "(") depth += 1
    else if (char === ")") depth -= 1
    else if (char === "," && depth === 0) {
      out.push(value.slice(start, i))
      start = i + 1
    }
  }
  out.push(value.slice(start))
  return out
}

/** Evaluate a `sizes` attribute the way a browser would, for one viewport. */
function evaluateSizes(sizes: string, viewport: number): number {
  for (const candidate of splitTopLevel(sizes)) {
    const entry = candidate.trim()
    const withQuery = entry.match(/^\((min|max)-width:\s*(\d+)px\)\s+(.+)$/)
    if (!withQuery) return lengthToPx(entry, viewport)
    const [, kind, breakpoint, length] = withQuery
    const px = Number(breakpoint)
    if (kind === "min" ? viewport >= px : viewport <= px) {
      return lengthToPx(length, viewport)
    }
  }
  return 0
}

describe("the sizes evaluator itself", () => {
  it("reads min-width, max-width, calc() and min() the way a browser does", () => {
    expect(evaluateSizes("(min-width: 1000px) 300px, 50vw", 1200)).toBe(300)
    expect(evaluateSizes("(min-width: 1000px) 300px, 50vw", 800)).toBe(400)
    expect(evaluateSizes("(max-width: 749px) 46vw, 220px", 500)).toBe(230)
    expect(evaluateSizes("calc(25vw - 55px)", 1200)).toBe(245)
    expect(evaluateSizes("min(46vw, 220px)", 1000)).toBe(220)
  })
})

/* -------------------------------------------------------------------------- */
/* Real slot geometry, transcribed from global.css                            */
/* -------------------------------------------------------------------------- */

const PAGE_MAX = 1600 // --page-width: 100rem

/** `.product-grid`: 2 / 3 / 4 columns inside `.page-width`. */
function productGridSlot(viewport: number): number {
  const [gutter, columns, gap] =
    viewport < 750 ? [21.6, 2, 10] : viewport < 990 ? [24, 3, 14] : [80, 4, 20]
  const content = Math.min(viewport, PAGE_MAX) - gutter * 2
  return (content - gap * (columns - 1)) / columns
}

/** `.shopby-grid`: 2 / 3 / 4 / 6 columns with fluid clamp() gutters. */
function shopByGridSlot(viewport: number): number {
  let gutter: number
  let columns: number
  let gap: number
  if (viewport < 750) [gutter, columns, gap] = [21.6, 2, 10]
  else if (viewport < 990) [gutter, columns, gap] = [24, 3, 12]
  else if (viewport < 1200) {
    // clamp(2rem, 6vw, 6rem)
    gutter = Math.min(96, Math.max(32, viewport * 0.06))
    columns = 4
    gap = 14
  } else {
    // clamp(2rem, 8vw, 10rem)
    gutter = Math.min(160, Math.max(32, viewport * 0.08))
    columns = 6
    gap = 14
  }
  const content = Math.min(viewport, PAGE_MAX) - gutter * 2
  return (content - gap * (columns - 1)) / columns
}

/** `.product-drag-slider .slider-track > *`. */
function railSlot(viewport: number): number {
  if (viewport < 990) return Math.min(viewport * 0.46, 220)
  return Math.min(250, Math.max(180, (Math.min(viewport, PAGE_MAX) - 192) / 6))
}

const VIEWPORTS = [360, 390, 430, 600, 768, 820, 900, 1024, 1180, 1280, 1440, 1600, 1920, 2560]

describe("IMAGE_SIZES matches the CSS it describes", () => {
  it("never understates a product-grid card slot", () => {
    for (const viewport of VIEWPORTS) {
      const declared = evaluateSizes(IMAGE_SIZES.card, viewport)
      const actual = productGridSlot(viewport)
      // A browser that is told less than the slot upscales — that is the bug.
      expect(declared, `card @${viewport}px`).toBeGreaterThanOrEqual(actual - 1)
      // ...and wildly overstating it would waste bandwidth instead.
      expect(declared, `card @${viewport}px`).toBeLessThanOrEqual(actual * 1.35)
    }
  })

  it("never understates a shop-by tile slot", () => {
    for (const viewport of VIEWPORTS) {
      const declared = evaluateSizes(IMAGE_SIZES.tile, viewport)
      const actual = shopByGridSlot(viewport)
      expect(declared, `tile @${viewport}px`).toBeGreaterThanOrEqual(actual - 1)
      expect(declared, `tile @${viewport}px`).toBeLessThanOrEqual(actual * 1.45)
    }
  })

  it("never understates a slider rail slot", () => {
    for (const viewport of VIEWPORTS) {
      const declared = evaluateSizes(IMAGE_SIZES.rail, viewport)
      const actual = railSlot(viewport)
      expect(declared, `rail @${viewport}px`).toBeGreaterThanOrEqual(actual - 1)
      expect(declared, `rail @${viewport}px`).toBeLessThanOrEqual(actual * 1.45)
    }
  })
})

describe("IMAGE_WIDTHS covers retina for the slot it serves", () => {
  const cases = [
    ["card", IMAGE_WIDTHS.card, productGridSlot],
    ["tile", IMAGE_WIDTHS.tile, shopByGridSlot],
    ["rail", IMAGE_WIDTHS.rail, railSlot],
  ] as const

  it.each(cases)("%s reaches ~2x its widest slot", (name, widths, slotOf) => {
    const widest = Math.max(...VIEWPORTS.map((viewport) => slotOf(viewport)))
    const largest = Math.max(...widths)
    // 2x DPR is the common retina case; allow a 5% shortfall before failing.
    expect(largest, `${name} ladder top`).toBeGreaterThanOrEqual(widest * 2 * 0.95)
  })

  it.each(cases)("%s starts small enough for a 1x phone", (name, widths) => {
    expect(Math.min(...widths), `${name} ladder floor`).toBeLessThanOrEqual(260)
  })

  it("keeps every ladder ascending, unique and within the resizer's range", () => {
    for (const [name, widths] of Object.entries(IMAGE_WIDTHS)) {
      const list = [...widths]
      expect(new Set(list).size, `${name} has duplicates`).toBe(list.length)
      expect([...list].sort((a, b) => a - b), `${name} is unsorted`).toEqual(list)
      // `/img/w{size}` rejects anything outside 32–2400.
      expect(Math.min(...list), `${name} below resizer min`).toBeGreaterThanOrEqual(32)
      expect(Math.max(...list), `${name} above resizer max`).toBeLessThanOrEqual(2400)
      // More steps than this means more sharp encodes than the SSR box wants.
      expect(list.length, `${name} has too many steps`).toBeLessThanOrEqual(4)
    }
  })
})

describe("client-injected cards mirror the server geometry", () => {
  /*
   * `catalog.ts` re-implements the card template in the browser (hydration
   * fallback + infinite scroll) and cannot import `lib/images.ts` — that module
   * pulls in `astro:assets`. The literals therefore have to be kept in sync by
   * hand, which is exactly the kind of thing that silently rots, so pin it.
   */
  const catalog = readFileSync(resolve(__dirname, "../src/scripts/catalog.ts"), "utf-8")

  it("uses the same sizes strings as IMAGE_SIZES", () => {
    expect(catalog).toContain(IMAGE_SIZES.card)
    expect(catalog).toContain(IMAGE_SIZES.tile)
  })

  it("uses the same srcset ladders as IMAGE_WIDTHS", () => {
    expect(catalog).toContain(`const CARD_WIDTHS = [${IMAGE_WIDTHS.card.join(", ")}]`)
    expect(catalog).toContain(`const TILE_WIDTHS = [${IMAGE_WIDTHS.tile.join(", ")}]`)
  })

  it("emits a srcset for local artwork instead of one fixed width", () => {
    // The regression: `src="/img/w400/…"` with no srcset, upscaled by the grid.
    expect(catalog).toMatch(/function cardSrcset/)
    expect(catalog).toMatch(/srcset="\$\{escapeHtml\(srcset\)\}"/)
  })
})

describe("source resolution", () => {
  it("routes public/ artwork to the resizer and leaves remote URLs alone", () => {
    expect(resolveImageSource("/images/products/1.jpg")).toEqual({
      kind: "local",
      src: "/images/products/1.jpg",
    })
    expect(resolveImageSource("https://cdn.example.com/a.jpg").kind).toBe("remote")
    expect(resolveImageSource("").kind).toBe("empty")
    expect(resolveImageSource(null).kind).toBe("empty")
  })

  it("never double-resizes something that is already optimised", () => {
    expect(isPreOptimizedUrl("/img/w400/images/products/1.jpg")).toBe(true)
    expect(isPreOptimizedUrl("/_astro/hero.abc123.webp")).toBe(true)
    expect(isPreOptimizedUrl("/@fs/repo/src/assets/a.webp?origWidth=800")).toBe(true)
    expect(isPreOptimizedUrl("/images/products/1.jpg")).toBe(false)
  })
})
