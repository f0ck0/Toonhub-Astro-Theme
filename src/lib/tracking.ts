import type { MedusaOrder, MedusaShippingMethodLike } from "../types"

export type TrackItem = {
  tracking_number: string
  url: string
  carrier: string
}

/** Loose object a tracking entry can be, across Medusa versions. */
interface TrackingLike {
  tracking_number?: string | number
  tracking_numbers?: unknown[]
  number?: string | number
  id?: string | number
  url?: string
  tracking_url?: string
  href?: string
  carrier?: string
  provider?: string
  company?: string
}

function carrierOf(num: string, hint = ""): string {
  const n = num.replace(/\s/g, "").toUpperCase()
  const h = hint.toLowerCase()
  if (h.includes("ups") || n.startsWith("1Z")) return "UPS"
  if (h.includes("fedex") || (/^(\d{12,22})$/.test(n) && n.length === 12)) return h.includes("fedex") ? "FedEx" : ""
  if (h.includes("dhl") || n.startsWith("JD") || (/^(\d{10,11})$/.test(n) && h.includes("dhl"))) return "DHL"
  if (h.includes("usps")) return "USPS"
  if (h.includes("yun") || n.startsWith("YT")) return "YunExpress"
  if (h.includes("4px") || n.startsWith("4PX")) return "4PX"
  if (h.includes("yanwen") || n.startsWith("YA")) return "Yanwen"
  if (h.includes("china") || n.startsWith("LP") || n.startsWith("EE")) return "China Post"
  if (h.includes("sf") || n.startsWith("SF")) return "SF Express"
  return hint || "Carrier"
}

export function trackLookupUrl(num: string, existing = ""): string {
  if (existing && /^https?:\/\//i.test(existing)) return existing
  return `https://t.17track.net/en#nums=${encodeURIComponent(num)}`
}

export function extractTracking(order: MedusaOrder | null | undefined): TrackItem[] {
  const out: TrackItem[] = []
  const seen = new Set<string>()

  const push = (raw: unknown, carrierHint = ""): void => {
    if (!raw) return
    if (typeof raw === "string" || typeof raw === "number") {
      const num = String(raw).trim()
      if (!num || seen.has(num)) return
      seen.add(num)
      out.push({ tracking_number: num, url: trackLookupUrl(num), carrier: carrierOf(num, carrierHint) })
      return
    }
    if (typeof raw !== "object") return
    const entry = raw as TrackingLike
    const firstListed = Array.isArray(entry.tracking_numbers)
      ? (entry.tracking_numbers[0] as string | number | undefined)
      : undefined
    const num = String(entry.tracking_number ?? entry.number ?? firstListed ?? entry.id ?? "").trim()
    const href = String(entry.url || entry.tracking_url || entry.href || "")
    if (!num && !href) return
    const key = num || href
    if (seen.has(key)) return
    seen.add(key)
    const carrier = carrierOf(num, entry.carrier || entry.provider || entry.company || carrierHint)
    out.push({
      tracking_number: num,
      url: trackLookupUrl(num, href),
      carrier,
    })
  }

  // Medusa exposes tracking data on fulfillments *and* on legacy shipping
  // methods, with different key names per version.
  const fulfillmentSources: MedusaShippingMethodLike[] = [
    ...(Array.isArray(order?.fulfillments) ? order.fulfillments : []),
    ...(Array.isArray(order?.shipping_methods) ? order.shipping_methods : []),
  ]
  for (const f of fulfillmentSources) {
    const hint = f?.provider_id || f?.name || ""
    for (const t of f?.tracking_links || []) push(t, hint)
    for (const t of f?.labels || []) push(t, hint)
    for (const n of f?.tracking_numbers || []) push(n, hint)
    if (f?.tracking_number) push(f.tracking_number, hint)
  }
  for (const t of order?.tracking || []) push(t)
  for (const n of order?.tracking_numbers || []) push(n)
  return out
}

export function orderTrackStatus(order: MedusaOrder | null | undefined): string {
  return String(order?.fulfillment_status || order?.status || order?.payment_status || "placed")
}
