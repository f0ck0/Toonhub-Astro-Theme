/**
 * Tiny i18n runtime.
 *
 * `useTranslations()` returns a `t()` function bound to a locale. It is safe to
 * call with `undefined`, a full BCP-47 tag (`en-US`), or a mismatched tag —
 * everything falls back to `defaultLocale` and missing keys fall back to
 * English rather than rendering `undefined`.
 *
 * Usage in a component:
 * ```astro
 * const t = useTranslations(pageLocale(Astro))
 * <button aria-label={t("a11y.openCart")}>…</button>
 * ```
 */

import { defaultLocale, locales, ui, type Locale, type UiKey } from "../i18n/ui"

export type { Locale, UiKey }
export { defaultLocale, locales, ui }

export type TranslateVars = Record<string, string | number>

export type Translate = (key: UiKey, vars?: TranslateVars) => string

/**
 * `en-US` → `en`, `zh-TW`/`zh-CN` → `zh-Hant`, `ja-JP` → `ja`.
 * Returns `undefined` (not the default) when nothing matches, so callers can
 * tell "this tag is supported" from "fall back".
 */
export function matchLocale(lang?: string | null): Locale | undefined {
  const raw = String(lang || "").trim().toLowerCase()
  if (!raw || raw === "*") return undefined
  const exact = locales.find((l) => l.toLowerCase() === raw)
  if (exact) return exact
  const base = raw.split("-")[0]
  // Only one Chinese is stocked (Traditional), so every zh-* maps to it.
  if (base === "zh") return "zh-Hant"
  return locales.find((l) => l.toLowerCase().split("-")[0] === base)
}

/** `en-US` → `en`, `zh-TW` → `zh-Hant`, unknown → default locale. */
export function normalizeLocale(lang?: string | null): Locale {
  return matchLocale(lang) ?? defaultLocale
}

/** Cookie that stores an explicit language choice made in the footer. */
export const LOCALE_COOKIE = "toonhub_locale"

/**
 * Pick the UI locale for a request: an explicit choice (cookie) wins, then the
 * browser's `Accept-Language` (q-values respected), then `defaultLocale`.
 *
 * This theme negotiates the locale **per visitor instead of per URL**: catalogue
 * copy comes from Medusa untranslated, so `/ja/…` duplicates would be thin
 * pages differing only in chrome. One canonical URL per page keeps the SEO
 * surface clean — see `hreflangAlternates` note below before changing that.
 */
export function negotiateLocale(cookieValue?: string | null, acceptLanguage?: string | null): Locale {
  const explicit = matchLocale(cookieValue)
  if (explicit) return explicit
  const header = String(acceptLanguage || "").trim()
  if (!header) return defaultLocale
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";")
      const qParam = params.find((param) => param.trim().toLowerCase().startsWith("q="))
      const q = qParam ? Number.parseFloat(qParam.split("=")[1] ?? "1") : 1
      return { tag: String(tag || "").trim(), q: Number.isFinite(q) ? q : 0 }
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q)
  for (const entry of ranked) {
    const matched = matchLocale(entry.tag)
    if (matched) return matched
  }
  return defaultLocale
}

/**
 * The locale a page/component should render in.
 *
 * `override` is a component's explicit `lang` prop; otherwise the value
 * negotiated by `src/middleware.ts` (`Astro.locals.locale`) is used, with
 * `Astro.currentLocale` as the last resort for pages rendered outside the
 * middleware chain. Prefer this over reading `Astro.currentLocale` directly —
 * with `output: "server"` and no `src/pages/[locale]/` folders, `currentLocale`
 * is always the default locale and the other dictionaries stay unreachable.
 */
export function pageLocale(
  astro: { locals?: { locale?: Locale | string } | undefined; currentLocale?: string | undefined },
  override?: string | null,
): Locale {
  return normalizeLocale(override || astro?.locals?.locale || astro?.currentLocale)
}

export function localeLabel(locale: Locale): string {
  return { en: "English", "zh-Hant": "繁體中文", ja: "日本語" }[locale]
}

/** Text direction — everything today is LTR, but RTL locales can be added. */
export function directionOf(locale: Locale): "ltr" | "rtl" {
  return ["ar", "he", "fa", "ur"].includes(locale.split("-")[0]) ? "rtl" : "ltr"
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/** Bind a translator to a locale, with English as the safety net. */
export function useTranslations(locale?: string | null): Translate {
  const active = normalizeLocale(locale)
  const table = ui[active] ?? ui[defaultLocale]
  const fallback = ui[defaultLocale]
  return (key, vars) => interpolate(table[key] ?? fallback[key] ?? key, vars)
}

/**
 * `<link rel="alternate" hreflang>` is intentionally **not** emitted.
 *
 * The locale is negotiated per visitor (cookie / `Accept-Language`), so every
 * page has exactly one URL and one canonical — hreflang clusters would need
 * locale-prefixed routes (`/ja/…`), which `output: "server"` only creates from
 * real `src/pages/ja/` folders. Advertising prefixed URLs without those files
 * would point crawlers at 404s. If localized URLs are ever wanted, add the
 * route folders (or a middleware rewrite), prefix internal links, then rebuild
 * the alternates here and pass them to `<Base alternates={…}>`.
 */
