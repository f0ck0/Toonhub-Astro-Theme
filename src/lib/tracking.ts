export type TrackItem = {
  tracking_number: string
  url: string
  carrier: string
}

function carrierOf(num: string, hint = "") {
  const n = num.replace(/\s/g, "").toUpperCase()
  const h = hint.toLowerCase()
  if (h.includes("ups") || n.startsWith("1Z")) return "UPS"
  if (h.includes("fedex") || /^(\d{12,22})$/.test(n) && n.length === 12) return h.includes("fedex") ? "FedEx" : ""
  if (h.includes("dhl") || n.startsWith("JD") || /^(\d{10,11})$/.test(n) && h.includes("dhl")) return "DHL"
  if (h.includes("usps")) return "USPS"
  if (h.includes("yun") || n.startsWith("YT")) return "YunExpress"
  if (h.includes("4px") || n.startsWith("4PX")) return "4PX"
  if (h.includes("yanwen") || n.startsWith("YA")) return "Yanwen"
  if (h.includes("china") || n.startsWith("LP") || n.startsWith("EE")) return "China Post"
  if (h.includes("sf") || n.startsWith("SF")) return "SF Express"
  return hint || "Carrier"
}

export function trackLookupUrl(num: string, existing = "") {
  if (existing && /^https?:\/\//i.test(existing)) return existing
  return `https://t.17track.net/en#nums=${encodeURIComponent(num)}`
}

export function extractTracking(order: any): TrackItem[] {
  const out: TrackItem[] = []
  const seen = new Set<string>()
  const push = (raw: any, carrierHint = "") => {
    if (!raw) return
    if (typeof raw === "string") {
      const num = raw.trim()
      if (!num || seen.has(num)) return
      seen.add(num)
      out.push({ tracking_number: num, url: trackLookupUrl(num), carrier: carrierOf(num, carrierHint) })
      return
    }
    const num = String(raw.tracking_number || raw.number || raw.tracking_numbers?.[0] || raw.id || "").trim()
    const href = String(raw.url || raw.tracking_url || raw.href || "")
    if (!num && !href) return
    const key = num || href
    if (seen.has(key)) return
    seen.add(key)
    const carrier = carrierOf(num, raw.carrier || raw.provider || raw.company || carrierHint)
    out.push({
      tracking_number: num,
      url: trackLookupUrl(num, href),
      carrier,
    })
  }

  for (const f of [].concat(order?.fulfillments || []).concat(order?.shipping_methods || [])) {
    const hint = f?.provider_id || f?.name || ""
    for (const t of f.tracking_links || []) push(t, hint)
    for (const t of f.labels || []) push(t, hint)
    for (const n of f.tracking_numbers || []) push(n, hint)
    if (f.tracking_number) push(f.tracking_number, hint)
  }
  for (const t of order?.tracking || []) push(t)
  for (const n of order?.tracking_numbers || []) push(n)
  return out
}

export function orderTrackStatus(order: any) {
  return order?.fulfillment_status || order?.status || order?.payment_status || "placed"
}
