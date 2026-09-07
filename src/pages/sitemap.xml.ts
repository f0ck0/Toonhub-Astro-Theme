import type { APIRoute } from "astro"
import { getCollection } from "astro:content"
import { getAllProductHandles, getNavCategories } from "../lib/medusa"
import { buildSitemapEntries, renderSitemapXml } from "../lib/sitemap"
import { SITE } from "../lib/site"

export const prerender = false

/**
 * The store's single sitemap. Dynamic on purpose — products, categories and
 * blog posts are enumerated at request time (through the same 60 s TTL cache
 * the pages use), so a catalogue change never waits for a redeploy.
 *
 * `public/robots.txt` points here; there is no `@astrojs/sitemap` integration
 * (it emitted a second, crawl-stale sitemap-index including noindex routes).
 *
 * Only indexable surfaces are listed — cart/account/wishlist/search/checkout
 * are `noindex` and are deliberately excluded by `SITEMAP_STATIC_PATHS`.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = String(site ?? SITE.url).replace(/\/+$/, "")

  // Every source fails soft on its own so one outage never empties the map.
  const [categories, products, posts] = await Promise.all([
    getNavCategories().catch(() => []),
    getAllProductHandles().catch(() => []),
    getCollection("posts")
      .then((entries) =>
        entries.map((entry) => ({
          id: entry.id,
          draft: entry.data.draft,
          pubDate: entry.data.pubDate,
        })),
      )
      .catch(() => []),
  ])

  const entries = buildSitemapEntries({ categories, products, posts })
  const body = renderSitemapXml(origin, entries)
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Fresh enough to reflect catalogue edits, cached enough for crawlers.
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  })
}
