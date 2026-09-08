/**
 * Page-markup contracts for surfaces that have no runtime test harness.
 *
 * These read the `.astro` source rather than rendering it: the pages are SSR
 * and need a live Medusa backend, but the specific things asserted here are
 * static structure that a careless edit would silently undo.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { ui } from "../src/i18n/ui"

const read = (path: string) => readFileSync(resolve(__dirname, "..", path), "utf-8")

const trackOrder = read("src/pages/track-order.astro")
const home = read("src/pages/index.astro")
const marquees = read("src/components/ReviewMarquees.astro")

describe("track-order page", () => {
  it("does not print the intro paragraph above the form", () => {
    // Requested removal: "Enter the order number from your confirmation
    // email plus the email you ordered with…"
    expect(trackOrder).not.toContain('<p class="page-head__intro">')
    expect(trackOrder).not.toMatch(/\{t\("track\.intro"\)\}/)
  })

  it("still uses track.intro for the meta description", () => {
    // The copy is useful to search engines even though it is off the page.
    expect(trackOrder).toContain('description={t("track.intro").slice(0, 155)}')
  })

  it('does not show a visible "Tracking result" banner', () => {
    expect(trackOrder).not.toContain('class="track-result__title"')
  })

  it("keeps the result section named for assistive tech", () => {
    // Removing the heading outright would leave aria-labelledby dangling.
    expect(trackOrder).toContain('aria-labelledby="trackResultHeading"')
    expect(trackOrder).toContain('<h2 class="sr-only" id="trackResultHeading">')
  })

  it("no longer renders the free-shipping / returns / SSL list", () => {
    expect(trackOrder).not.toContain("TrustIcons")
    expect(trackOrder).not.toContain("track-trust")
  })

  it("keeps the lookup form and its live result region intact", () => {
    expect(trackOrder).toContain("data-track-form")
    expect(trackOrder).toContain("data-track-result")
    expect(trackOrder).toContain('aria-live="polite"')
    for (const field of ["trackOrder", "trackEmail", "trackParcel"]) {
      expect(trackOrder, `${field} input missing`).toContain(`id="${field}"`)
    }
  })

  it("leaves the dictionary keys in place for every locale", () => {
    // The strings are still referenced (meta description, a11y heading), so
    // dropping them from the dictionary would break the key-parity test.
    for (const locale of Object.keys(ui) as (keyof typeof ui)[]) {
      expect(ui[locale]["track.intro"], `${locale}`).toBeTruthy()
      expect(ui[locale]["track.resultHeading"], `${locale}`).toBeTruthy()
    }
  })
})

describe("homepage rating strip placement", () => {
  it("slots the rating strip under the review-marquee heading", () => {
    expect(home).toMatch(/<ReviewMedals slot="under-heading"/)
    expect(home).toContain("count={reviewStats.count}")
    expect(home).toContain("rating={reviewStats.average}")
  })

  it("exposes an under-heading slot right below the marquee title", () => {
    const head = marquees.slice(
      marquees.indexOf('class="review-marquees__headline"'),
      marquees.indexOf("review-marquees__sub"),
    )
    expect(head).toContain("reviewMarqueesHeading")
    expect(head).toContain('<slot name="under-heading" />')
    // The heading must come first — the strip sits *under* the title text.
    expect(head.indexOf("reviewMarqueesHeading")).toBeLessThan(
      head.indexOf('<slot name="under-heading" />'),
    )
  })

  it("renders the strip exactly once", () => {
    // `reviews.ts` hydrates the first [data-hydrate-reviews] it finds, so a
    // duplicate standalone strip would leave a second, permanently empty one.
    expect(home).toContain("{reviewCards.length === 0 && <ReviewMedals />}")
    expect(home.match(/<ReviewMedals/g) ?? []).toHaveLength(2)
  })

  it("feeds the strip from the same fetch as the marquee cards", () => {
    // One round trip, and the two widgets cannot disagree on the total.
    expect(home).toContain("const globalFeed = await fetchReviews(undefined, 60)")
    expect(home).toContain("fetchGlobal: async () => globalFeed")
    expect(home).toContain("reviewStats = summarizeReviews(globalFeed)")
  })
})
