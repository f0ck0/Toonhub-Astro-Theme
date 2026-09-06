/**
 * Multi-currency, multi-locale utilities for Toonhub.
 *
 * Medusa stores prices primarily in USD (minor units). This module provides:
 *  - currency symbol / locale-aware formatting (Intl.NumberFormat)
 *  - static USD-anchored conversion rates with optional live-rate refresh
 *  - IP/country based currency detection (browser Intl fallback)
 *  - user-preference persistence (cookie) with a client-side setter
 */

export type CurrencyCode = string

/* ---------- Static conversion rates (USD = 1) ----------
 * Used as fallback when the live rate API is unreachable.
 * Rates are illustrative snapshots; keep USD base.
 */
export const STATIC_RATES: Record<string, number> = {
  usd: 1,
  eur: 0.92,
  gbp: 0.79,
  aud: 1.52,
  cad: 1.37,
  jpy: 156,
  cny: 7.25,
  hkd: 7.8,
  sgd: 1.34,
  nzd: 1.64,
  chf: 0.88,
  krw: 1380,
  inr: 83.5,
  mxn: 18.2,
  brl: 5.4,
  try: 34,
  aed: 3.67,
  sar: 3.75,
}

/* Country -> preferred currency (for IP detection) */
export const COUNTRY_CURRENCY: Record<string, string> = {
  US: "usd",
  CA: "cad",
  GB: "gbp",
  AU: "aud",
  NZ: "nzd",
  DE: "eur",
  FR: "eur",
  IT: "eur",
  ES: "eur",
  NL: "eur",
  BE: "eur",
  AT: "eur",
  IE: "eur",
  PT: "eur",
  FI: "eur",
  SE: "sek",
  NO: "nok",
  DK: "dkk",
  CH: "chf",
  JP: "jpy",
  CN: "cny",
  HK: "hkd",
  TW: "twd",
  KR: "krw",
  SG: "sgd",
  IN: "inr",
  AE: "aed",
  SA: "sar",
  MX: "mxn",
  BR: "brl",
  TR: "try",
  TH: "thb",
  ID: "idr",
  MY: "myr",
  PH: "php",
  VN: "vnd",
}

/* Locale per currency for Intl formatting */
const CURRENCY_LOCALE: Record<string, string> = {
  usd: "en-US",
  eur: "de-DE",
  gbp: "en-GB",
  aud: "en-AU",
  cad: "en-CA",
  jpy: "ja-JP",
  cny: "zh-CN",
  hkd: "zh-HK",
  sgd: "en-SG",
  nzd: "en-NZ",
  chf: "de-CH",
  krw: "ko-KR",
  inr: "en-IN",
}

/* ---------- Rate fetching (live API with static fallback) ---------- */
let cachedRates: Record<string, number> | null = null
let cacheTime = 0
const CACHE_TTL = 60 * 60 * 1000 // 1h

export async function fetchRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (cachedRates && now - cacheTime < CACHE_TTL) return cachedRates
  try {
    // open.er-api.com: free, no key, returns rates anchored to USD
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const data = (await res.json()) as { result?: string; rates?: Record<string, number> }
      if (data.result === "success" && data.rates) {
        cachedRates = { ...STATIC_RATES, ...data.rates }
        cacheTime = now
        return cachedRates
      }
    }
  } catch {
    /* offline — fall through to static */
  }
  return STATIC_RATES
}

export function getRate(currency: string, rates: Record<string, number> = STATIC_RATES): number {
  return rates[currency?.toLowerCase()] ?? 1
}

/* ---------- Price formatting ---------- */

/** Convert a USD minor-unit amount into another currency (minor units). */
export function convertAmount(usdMinor: number, currency: string, rates: Record<string, number> = STATIC_RATES): number {
  const minor = usdMinor ?? 0
  const rate = getRate(currency, rates)
  return Math.round(minor * rate)
}

/** Format a minor-unit amount for a currency, e.g. $34.00 / €31.28 / ¥5,304. */
export function formatCurrency(amountMinor: number, currency: string, opts: { from?: string; compact?: boolean } = {}): string {
  const code = currency?.toUpperCase() || "USD"
  const locale = CURRENCY_LOCALE[code.toLowerCase()] || "en-US"
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: opts.compact && (code === "JPY" || code === "KRW") ? 0 : 2,
      maximumFractionDigits: opts.compact && (code === "JPY" || code === "KRW") ? 0 : 2,
    }).format((amountMinor ?? 0) / 100)
  } catch {
    return `${code} ${((amountMinor ?? 0) / 100).toFixed(2)}`
  }
}

/** "From $34.00" — Shopify-style range prefix. */
export function formatPriceFrom(amountMinor: number, currency: string): string {
  return `From ${formatCurrency(amountMinor, currency)}`
}

/* ---------- IP / country based detection ---------- */

export interface GeoInfo {
  country?: string
  currency?: string
  timezone?: string
}

/** Best-effort geolocation by IP; returns {} on failure (caller falls back). */
export async function detectGeo(ip?: string): Promise<GeoInfo> {
  try {
    const q = ip ? `?ip=${encodeURIComponent(ip)}` : ""
    const res = await fetch(`https://ipapi.co/json${q}`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const d = (await res.json()) as { country_code?: string; currency?: string; timezone?: string }
      if (d.country_code || d.currency) {
        return {
          country: d.country_code,
          currency: d.currency?.toLowerCase(),
          timezone: d.timezone,
        }
      }
    }
  } catch {
    /* offline */
  }
  return {}
}

/** Currency resolved from a user's locale (browser Intl fallback). */
export function currencyFromLocale(locale?: string): string {
  const l = (locale || "en-US").toLowerCase()
  if (l.includes("zh")) return "cny"
  if (l.includes("ja")) return "jpy"
  if (l.includes("ko")) return "krw"
  if (l.includes("de") || l.includes("fr") || l.includes("es") || l.includes("it")) return "eur"
  if (l.includes("en-gb")) return "gbp"
  if (l.includes("en-au")) return "aud"
  if (l.includes("en-ca")) return "cad"
  return "usd"
}

/** Resolve effective currency: explicit choice > geo > locale > usd. */
export async function resolveCurrency(opts: {
  chosen?: string | null
  geoCountry?: string
  geoCurrency?: string
  locale?: string
}): Promise<string> {
  if (opts.chosen) return opts.chosen.toLowerCase()
  if (opts.geoCurrency) return opts.geoCurrency.toLowerCase()
  if (opts.geoCountry) {
    const c = COUNTRY_CURRENCY[opts.geoCountry.toUpperCase()]
    if (c) return c
  }
  return currencyFromLocale(opts.locale)
}

/* ---------- User preference persistence (client side) ---------- */

export const CURRENCY_COOKIE = "toonhub_currency"

export function setCurrencyCookie(code: string): void {
  if (typeof document === "undefined") return
  document.cookie = `${CURRENCY_COOKIE}=${code.toLowerCase()}; path=/; max-age=31536000; samesite=lax`
}

export function readCurrencyCookie(): string | null {
  if (typeof document === "undefined") return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${CURRENCY_COOKIE}=([^;]+)`))
  return m ? m[1] : null
}

/** SSR-safe currency from Astro.cookies (falls back to usd). */
export function currencyFromCookies(cookies?: { get: (name: string) => { value: string } | undefined } | null): string {
  const v = cookies?.get(CURRENCY_COOKIE)?.value
  return (v || "usd").toLowerCase()
}

export const CURRENCY_OPTIONS = [
  { code: "usd", label: "USD $ — US Dollar", flag: "🇺🇸" },
  { code: "eur", label: "EUR € — Euro", flag: "🇪🇺" },
  { code: "gbp", label: "GBP £ — British Pound", flag: "🇬🇧" },
  { code: "aud", label: "AUD AU$ — Australian Dollar", flag: "🇦🇺" },
  { code: "cad", label: "CAD CA$ — Canadian Dollar", flag: "🇨🇦" },
  { code: "jpy", label: "JPY ¥ — Japanese Yen", flag: "🇯🇵" },
  { code: "cny", label: "CNY CN¥ — Chinese Yuan", flag: "🇨🇳" },
] as const

export function currencyLabel(code: string): string {
  const map: Record<string, string> = {
    usd: "USD $",
    eur: "EUR €",
    gbp: "GBP £",
    aud: "AUD AU$",
    cad: "CAD CA$",
    jpy: "JPY ¥",
    cny: "CNY CN¥",
  }
  return map[code?.toLowerCase()] || code.toUpperCase()
}

/** Sale simulation: reference store uses 50% off. Returns { original, sale } in the target currency. */
export function salePrice(usdMinor: number, currency: string, rates: Record<string, number> = STATIC_RATES) {
  const sale = convertAmount(usdMinor, currency, rates)
  const original = Math.round(sale * 2)
  return { original, sale }
}
