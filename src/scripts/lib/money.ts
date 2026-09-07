/**
 * Client-side money helpers.
 *
 * Formatting and conversion live in `src/lib/currency.ts`, which is isomorphic —
 * the same module renders SSR prices and drawer totals, so the cart can never
 * disagree with the card. Only cart-specific maths lives here.
 */

import {
  convertAmount,
  formatCurrency,
  readCurrencyCookie,
  setCurrencyCookie,
  STATIC_RATES,
} from "../../lib/currency"
import type { CartItem } from "../../types"

export { convertAmount, formatCurrency, readCurrencyCookie, setCurrencyCookie, STATIC_RATES }

/** Active display currency (cookie → server default → usd). */
export function getCurrency(): string {
  return (readCurrencyCookie() || "usd").toLowerCase()
}

/**
 * Medusa sends some deployments amounts in major units and others in minor
 * units. Anything below 1000 is treated as major and scaled, matching the
 * server-side `getProductUsdPrice()`.
 */
export function toMinorUnits(amount: unknown): number {
  const raw = Number(
    typeof amount === "object" && amount !== null
      ? (amount as { amount?: number }).amount
      : amount,
  )
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return raw > 0 && raw < 1000 ? Math.round(raw * 100) : Math.round(raw)
}

/** Minor units in USD → formatted string in the active currency. */
export function formatMoney(usdMinor: number, currency = getCurrency()): string {
  return formatCurrency(convertAmount(Number(usdMinor) || 0, currency), currency)
}

export function subtotalOf(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0), 0)
}

export function unitCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
}

/**
 * Buy 1 get 2nd 50% off: pair the most expensive units together and halve the
 * cheaper one of each pair. Mirrors the server summary so the drawer, the cart
 * page and checkout agree.
 */
export function bogoDiscount(items: CartItem[]): number {
  const units: number[] = []
  for (const item of items) {
    const price = Number(item.unit_price) || 0
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0))
    for (let i = 0; i < qty; i += 1) units.push(price)
  }
  units.sort((a, b) => b - a)
  let discount = 0
  for (let i = 0; i + 1 < units.length; i += 2) {
    discount += Math.round(Math.min(units[i], units[i + 1]) * 0.5)
  }
  return discount
}
