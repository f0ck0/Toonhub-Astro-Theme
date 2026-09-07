import type { APIRoute } from "astro"
import { LOCALE_COOKIE, defaultLocale, matchLocale } from "../../lib/i18n"

export const prerender = false

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * Only allow same-origin paths. Anything else (`https://evil.example`,
 * protocol-relative `//evil.example`, backslash tricks) falls back to `/`, so
 * the language switcher can never be turned into an open redirect.
 */
function safeNext(raw: string | null): string {
  const next = String(raw || "").trim()
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/"
  if (/^\/[^/]*:/.test(next)) return "/"
  return next.slice(0, 500) || "/"
}

/**
 * `GET|POST /api/locale?set=ja&next=/collections`
 *
 * Stores the visitor's explicit language choice and sends them back to the page
 * they were on. Used by the footer switcher as a plain link, so changing
 * language works with JavaScript disabled. Passing the default locale clears the
 * cookie and lets `Accept-Language` negotiation take over again.
 */
const handler: APIRoute = async ({ url, cookies, redirect }) => {
  const requested = url.searchParams.get("set") || url.searchParams.get("locale")
  const locale = matchLocale(requested)
  const next = safeNext(url.searchParams.get("next"))

  if (locale && locale !== defaultLocale) {
    cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
      secure: url.protocol === "https:",
    })
  } else {
    cookies.delete(LOCALE_COOKIE, { path: "/", sameSite: "lax" })
  }

  return redirect(next, 302)
}

export const GET = handler
export const POST = handler
