import { describe, expect, it } from "vitest"
import {
  convertAmount,
  currencyFromCookies,
  currencyFromLocale,
  formatCurrency,
  getRate,
  resolveCurrency,
  salePrice,
  STATIC_RATES,
} from "../src/lib/currency"
import { provincesOf, resolveCountryCode, countryFromCurrency, countryFromTimezone, countryName } from "../src/lib/regions"

describe("currency math", () => {
  it("converts USD minor units through the static rate table", () => {
    expect(convertAmount(1000, "usd")).toBe(1000)
    expect(convertAmount(1000, "jpy")).toBe(1000 * STATIC_RATES.jpy)
    expect(convertAmount(0, "eur")).toBe(0)
  })

  it("getRate falls back to 1 for unknown currencies", () => {
    expect(getRate("usd")).toBe(1)
    expect(getRate("xxx-unknown")).toBe(1)
  })

  it("formats minor-unit amounts with the currency symbol (no conversion)", () => {
    expect(formatCurrency(3400, "usd")).toContain("34.00")
    // Minor units are divided by 100 to major units, then formatted per locale.
    expect(formatCurrency(3400, "eur")).toContain("34,00")
    expect(formatCurrency(3400, "gbp")).toContain("34.00")
  })

  it("salePrice doubles the sale amount for the compare-at price", () => {
    const { original, sale } = salePrice(5000, "usd")
    expect(sale).toBe(5000)
    expect(original).toBe(10000)
  })

  it("currencyFromLocale maps language families to plausible currencies", () => {
    expect(currencyFromLocale("zh-HK")).toBe("cny")
    expect(currencyFromLocale("ja-JP")).toBe("jpy")
    expect(currencyFromLocale("en-GB")).toBe("gbp")
    expect(currencyFromLocale("de-DE")).toBe("eur")
    expect(currencyFromLocale("en-US")).toBe("usd")
  })

  it("resolveCurrency honours explicit choice over geo over locale", async () => {
    expect(await resolveCurrency({ chosen: "EUR", geoCurrency: "jpy", locale: "ja-JP" })).toBe("eur")
    expect(await resolveCurrency({ geoCurrency: "JPY", locale: "en-US" })).toBe("jpy")
    expect(await resolveCurrency({ geoCountry: "GB", locale: "en-US" })).toBe("gbp")
    expect(await resolveCurrency({ locale: "ja-JP" })).toBe("jpy")
  })

  it("currencyFromCookies defaults to usd", () => {
    const cookies = { get: (_: string) => undefined as { value: string } | undefined }
    expect(currencyFromCookies(cookies)).toBe("usd")
    expect(currencyFromCookies(null)).toBe("usd")
    const withCookie = { get: (_: string) => ({ value: "HKD" }) }
    expect(currencyFromCookies(withCookie)).toBe("hkd")
  })
})

describe("regions", () => {
  it("resolves ISO codes case-insensitively", () => {
    expect(resolveCountryCode("HK")).toBe("hk")
    expect(resolveCountryCode("us")).toBe("us")
    expect(resolveCountryCode("JP")).toBe("jp")
  })

  it("resolves typed country names for the OTHER option", () => {
    expect(resolveCountryCode("OTHER", "Iceland")).toBe("is")
    expect(resolveCountryCode("OTHER", "South Korea")).toBe("kr")
    expect(resolveCountryCode("OTHER", "nowhere land")).toBe("us")
    expect(resolveCountryCode("XX", "")).toBe("us")
    expect(resolveCountryCode("", "")).toBe("us")
  })

  it("countryName humanizes codes and passes unknowns through", () => {
    expect(countryName("US")).toBe("United States")
    expect(countryName("hk")).toBe("Hong Kong")
    expect(countryName("Atlantis")).toBe("Atlantis")
  })

  it("provincesOf serves subdivisions for the big shipping countries", () => {
    expect(provincesOf("US").length).toBeGreaterThan(40)
    expect(provincesOf("JP").length).toBeGreaterThan(40)
    expect(provincesOf("hk")).toEqual([])
  })

  it("maps currencies and timezones to checkout country guesses", () => {
    expect(countryFromCurrency("hkd")).toBe("HK")
    expect(countryFromCurrency("jpy")).toBe("JP")
    expect(countryFromTimezone("Asia/Hong_Kong")).toBe("HK")
    expect(countryFromTimezone("Asia/Taipei")).toBe("TW")
    expect(countryFromTimezone("Pacific/Easter")).toBe("")
  })
})
