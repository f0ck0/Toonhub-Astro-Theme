import { describe, expect, it } from "vitest"
import {
  defaultLocale,
  localeForCurrency,
  locales,
  matchLocale,
  negotiateLocale,
  normalizeLocale,
  useTranslations,
  directionOf,
} from "../src/lib/i18n"
import { ui } from "../src/i18n/ui"

describe("ui dictionary", () => {
  it("keeps every locale in key-parity with English", () => {
    const en = Object.keys(ui.en)
    for (const locale of locales) {
      expect(Object.keys(ui[locale]).sort()).toEqual([...en].sort())
    }
  })

  it("has no empty translations", () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(ui[locale])) {
        expect(String(value).trim(), `${locale}:${key}`).not.toBe("")
      }
    }
  })
})

describe("matchLocale", () => {
  it("matches exact tags case-insensitively", () => {
    expect(matchLocale("en")).toBe("en")
    expect(matchLocale("JA")).toBe("ja")
    expect(matchLocale("zh-Hant")).toBe("zh-Hant")
  })

  it("maps every Chinese variant to the stocked Traditional dictionary", () => {
    // The HK scenario: a Hong Kong browser sends zh-HK and must get 繁體中文.
    expect(matchLocale("zh-HK")).toBe("zh-Hant")
    expect(matchLocale("zh-TW")).toBe("zh-Hant")
    expect(matchLocale("zh-CN")).toBe("zh-Hant")
    expect(matchLocale("zh")).toBe("zh-Hant")
  })

  it("matches by base language for regional tags", () => {
    expect(matchLocale("en-US")).toBe("en")
    expect(matchLocale("ja-JP")).toBe("ja")
  })

  it("returns undefined for unknown or wildcard input", () => {
    expect(matchLocale("fr")).toBeUndefined()
    expect(matchLocale("*")).toBeUndefined()
    expect(matchLocale("")).toBeUndefined()
    expect(matchLocale(null)).toBeUndefined()
  })
})

describe("normalizeLocale", () => {
  it("falls back to the default locale for unknown tags", () => {
    expect(normalizeLocale("fr-CA")).toBe(defaultLocale)
    expect(normalizeLocale(undefined)).toBe(defaultLocale)
    expect(normalizeLocale("zh-HK")).toBe("zh-Hant")
  })
})

describe("localeForCurrency — currency IS the language switcher", () => {
  it("maps Chinese currencies to Traditional Chinese", () => {
    expect(localeForCurrency("cny")).toBe("zh-Hant")
    expect(localeForCurrency("HKD")).toBe("zh-Hant")
    expect(localeForCurrency("twd")).toBe("zh-Hant")
  })

  it("maps yen to Japanese", () => {
    expect(localeForCurrency("jpy")).toBe("ja")
    expect(localeForCurrency("JPY")).toBe("ja")
  })

  it("every other explicit currency choice means English", () => {
    expect(localeForCurrency("usd")).toBe("en")
    expect(localeForCurrency("eur")).toBe("en")
    expect(localeForCurrency("gbp")).toBe("en")
    expect(localeForCurrency("krw")).toBe("en")
  })

  it("returns undefined when no currency was chosen (Accept-Language decides)", () => {
    expect(localeForCurrency("")).toBeUndefined()
    expect(localeForCurrency(null)).toBeUndefined()
    expect(localeForCurrency(undefined)).toBeUndefined()
    expect(localeForCurrency("   ")).toBeUndefined()
  })
})

describe("negotiateLocale", () => {
  it("prefers an explicit (currency-implied) choice over Accept-Language", () => {
    // Choosing JPY ⇒ Japanese storefront, no matter what the browser asked for.
    expect(negotiateLocale(localeForCurrency("jpy"), "zh-HK,zh;q=0.9")).toBe("ja")
    // Choosing USD ⇒ English, even for a Traditional-Chinese browser.
    expect(negotiateLocale(localeForCurrency("usd"), "zh-HK,zh;q=0.9")).toBe("en")
    expect(negotiateLocale(localeForCurrency("cny"), "en-US,en;q=0.9")).toBe("zh-Hant")
    expect(negotiateLocale("en-US", "ja-JP,ja;q=0.8")).toBe("en")
  })

  it("honours q-values in Accept-Language", () => {
    expect(negotiateLocale(null, "fr;q=0.9, ja;q=0.8, en;q=0.7")).toBe("ja")
    expect(negotiateLocale(null, "ja;q=0.1, en;q=0.9")).toBe("en")
  })

  it("skips unsupported tags and keeps ranking the rest", () => {
    expect(negotiateLocale(null, "fr-FR,fr;q=0.8, zh-HK;q=0.6")).toBe("zh-Hant")
  })

  it("ignores zero-q tags entirely", () => {
    expect(negotiateLocale(null, "ja;q=0, en;q=1")).toBe("en")
  })

  it("treats malformed q-values as zero", () => {
    expect(negotiateLocale(null, "ja;q=abc")).toBe(defaultLocale)
  })

  it("falls back to the default locale without signals", () => {
    expect(negotiateLocale(null, null)).toBe(defaultLocale)
    expect(negotiateLocale("hacking-attempt", "")).toBe(defaultLocale)
  })
})

describe("useTranslations", () => {
  const zh = useTranslations("zh-HK")

  it("translates into the negotiated locale", () => {
    expect(useTranslations("ja")("cart.title")).toBe(ui.ja["cart.title"])
    expect(zh("cart.title")).toBe(ui["zh-Hant"]["cart.title"])
  })

  it("falls back to English for unknown locales", () => {
    expect(useTranslations("fr")("cart.title")).toBe(ui.en["cart.title"])
  })

  it("interpolates variables", () => {
    expect(zh("grid.productCount", { count: 5 })).toBe("5 件商品")
    expect(useTranslations("en")("home.shopByListDesc", { count: 40 })).toContain("40")
  })

  it("never renders undefined for a known key", () => {
    expect(useTranslations("en")("footer.rights", { year: 2026, brand: "TOONHUB" })).toContain("2026")
  })

  it("directionOf keeps every supported locale LTR", () => {
    for (const locale of locales) expect(directionOf(locale)).toBe("ltr")
  })
})
