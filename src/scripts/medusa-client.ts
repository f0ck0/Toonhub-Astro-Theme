const FALLBACK = {
  baseUrl: "https://medusa.toonhubshop.com",
  publishableKey: "pk_7b55f85cfbc0b36baa03e4f3914732c2f5f9d8fc5ae3bb50a98e01d6fcc73c4b",
}

export function cfg() {
  const w = (window as any).toonhubMedusa
  const baseUrl = String(w?.baseUrl || FALLBACK.baseUrl).replace(/\/$/, "").replace(/^http:\/\/96\.47\.238\.191:9000$/, FALLBACK.baseUrl)
  const publishableKey = String(w?.publishableKey || FALLBACK.publishableKey)
  return { baseUrl, publishableKey }
}

export async function medusaGet(path: string): Promise<any> {
  const { baseUrl, publishableKey } = cfg()
  const raw = `${baseUrl}${path}`
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-publishable-api-key": publishableKey,
  }
  const urls = [
    raw,
    "https://corsproxy.org/?" + encodeURIComponent(raw),
    "https://corsproxy.io/?" + encodeURIComponent(raw),
    `/api/medusa-proxy?path=${encodeURIComponent(path)}`,
  ]
  let last = "Medusa request failed"
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers, mode: "cors", credentials: "omit", signal: AbortSignal.timeout(8000) })
      const text = await res.text()
      let data: any = {}
      try { data = text ? JSON.parse(text) : {} } catch { last = "non-JSON"; continue }
      if (data?.type === "not_allowed" || /publishable/i.test(String(data?.message || ""))) {
        last = data.message
        continue
      }
      if (data?.error && /unreachable|fetch failed|invalid path/i.test(String(data.error))) {
        last = data.error
        continue
      }
      if (res.ok) return data
      last = data.message || data.error || `HTTP ${res.status}`
    } catch (e: any) {
      last = e.message || last
    }
  }
  throw new Error(last)
}

export async function medusaSend(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: any }> {
  const { baseUrl, publishableKey } = cfg()
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    "x-publishable-api-key": publishableKey,
    ...(init.headers as any),
  }
  const raw = `${baseUrl}${path}`
  try {
    const res = await fetch(raw, { ...init, headers, mode: "cors", credentials: "omit", signal: init.signal || AbortSignal.timeout(8000) })
    const text = await res.text()
    let data: any = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
    return { ok: res.ok, status: res.status, data }
  } catch (e: any) {
    return { ok: false, status: 0, data: { error: e.message } }
  }
}
