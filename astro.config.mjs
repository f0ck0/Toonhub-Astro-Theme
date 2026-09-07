import { defineConfig } from "astro/config"
import node from "@astrojs/node"
import tailwindcss from "@tailwindcss/vite"
import { SITE_URL } from "./src/constants/site"

/**
 * Runtime configuration.
 *
 * `output: "server"` keeps every route dynamic (Medusa catalogue, cart,
 * checkout), so there is no build-time crawl of the backend. Anything that is
 * genuinely static (policies, about) opts in per-page with `prerender = true`.
 */

const MEDUSA_URL =
  process.env.MEDUSA_URL ||
  process.env.PUBLIC_MEDUSA_URL ||
  "https://medusa.toonhubshop.com"

/** Host names whose artwork may be pulled through Astro's image service. */
const remoteImageHosts = [
  ...new Set(
    [MEDUSA_URL, process.env.MEDIA_CDN_URL || ""]
      .map((value) => {
        try {
          return new URL(String(value)).hostname
        } catch {
          return ""
        }
      })
      .filter(Boolean),
  ),
]

export default defineConfig({
  site: SITE_URL,

  output: "server",
  adapter: node({ mode: "standalone" }),

  /**
   * No `@astrojs/sitemap` integration on purpose: with `output: "server"` it
   * only ever saw the handful of prerendered routes (it emitted a redundant
   * `sitemap-index.xml`/`sitemap-0.xml` pair that even listed noindex pages
   * like /cart and /account). The single source of truth is the dynamic
   * `src/pages/sitemap.xml.ts`, which `public/robots.txt` points at and which
   * enumerates live products/categories/blog posts on every request.
   */

  /**
   * Localisation scaffolding. `prefixDefaultLocale: false` keeps today's clean
   * URLs (`/collections`) for English, and `useTranslations()` already resolves
   * every UI string through it.
   *
   * Note: with `output: "server"` Astro only creates `/ja/…` + `/zh-Hant/…`
   * routes from real files under `src/pages/ja/` and `src/pages/zh-Hant/`, which
   * this theme does not ship — so `Astro.currentLocale` stays `en` and prefixed
   * URLs 404. The `zh-Hant`/`ja` dictionaries in `src/i18n/ui.ts` are ready for
   * whichever strategy is chosen next (localized route folders, or a middleware
   * that negotiates the locale from a cookie / `Accept-Language`); see the
   * warning on `hreflangAlternates()` in `src/lib/i18n.ts` before emitting
   * hreflang tags.
   */
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-Hant", "ja"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },

  image: {
    // Only used when MEDIA_REMOTE_OPTIMIZE=true — see src/components/Media.astro.
    remotePatterns: remoteImageHosts.map((hostname) => ({ hostname })),
    // AVIF first: ~25% smaller than WebP at equal quality on photographic art.
    formats: ["avif", "webp"],
  },

  build: {
    // Inline critical CSS, emit files for the rest — fewer render-blocking requests.
    inlineStylesheets: "auto",
    assetsPrefix: process.env.ASSETS_PREFIX || undefined,
  },

  compressHTML: true,
  trailingSlash: "ignore",

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Storefront targets evergreen browsers; esnext keeps the bundle small.
      target: "esnext",
      // Report the real weight of each storefront chunk during `astro build`.
      reportCompressedSize: false,
      chunkSizeWarningLimit: 600,
    },
  },

  server: {
    port: 8888,
    host: true,
    allowedHosts: true,
  },
  preview: {
    port: 3001,
    host: true,
    allowedHosts: true,
  },
})
