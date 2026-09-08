import { defineMiddleware } from "astro:middleware"
import { CURRENCY_COOKIE } from "./lib/currency"
import { localeForCurrency, negotiateLocale } from "./lib/i18n"

/**
 * Request middleware.
 *
 * 1. Negotiates the UI locale once per request (currency cookie → `Accept-Language`
 *    → default; choosing a currency also chooses the language — see
 *    `localeForCurrency`) and publishes it on `Astro.locals.locale`. Pages and
 *    components read it through `pageLocale(Astro)` — with `output: "server"`
 *    and no `src/pages/[locale]/` folders, `Astro.currentLocale` would always
 *    be `en` and the `zh-Hant` / `ja` dictionaries would be unreachable.
 * 2. Adds baseline security headers to every response.
 * 3. Gives immutable, content-hashed static assets a one-year cache.
 * 4. HTML: `no-cache` + `Vary: Accept-Language` — browsers always revalidate,
 *    so stale pages/bundles never stick (promo %, payment methods, …).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.locale = negotiateLocale(
    localeForCurrency(context.cookies.get(CURRENCY_COOKIE)?.value),
    context.request.headers.get("accept-language"),
  )

  const res = await next()
  const headers = new Headers(res.headers)
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("X-Frame-Options", "SAMEORIGIN")
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

  const path = context.url.pathname
  const isStaticAsset =
    /\.(woff2|webp|avif|png|jpe?g|svg|ico)$/i.test(path) || path.startsWith("/fonts/") || path.startsWith("/img/")

  if (isStaticAsset) {
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable")
    }
  } else if ((headers.get("Content-Type") || "").includes("text/html")) {
    // HTML varies by negotiated language; shared caches must not serve one
    // visitor's locale to another. no-cache forces browsers to revalidate the
    // HTML so the latest bundle references are always used. (`Vary: Cookie`
    // is deliberately omitted — it would defeat caching for every anonymous
    // hit.)
    headers.set("Cache-Control", "no-cache")
    const vary = headers.get("Vary")
    headers.set("Vary", vary ? `${vary}, Accept-Language` : "Accept-Language")
  }

  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
})
