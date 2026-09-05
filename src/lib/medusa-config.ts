import Medusa from "@medusajs/js-sdk"

/** Live Medusa backend. Port 80 is nginx; the Store API listens on 9000. */
export const DEFAULT_MEDUSA_URL = "http://96.47.238.191:9000"

export function medusaConfig() {
  const baseUrl = String(
    import.meta.env.MEDUSA_URL ||
    process.env.MEDUSA_URL ||
    DEFAULT_MEDUSA_URL,
  ).replace(/\/$/, "")
  const publishableKey = String(
    import.meta.env.MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    "",
  )
  const isLocal = /localhost|127\.0\.0\.1/.test(baseUrl)
  return { baseUrl, publishableKey, isLocal }
}

let _sdk: Medusa | null = null
let _sig = ""

export function getStoreSdk() {
  const { baseUrl, publishableKey } = medusaConfig()
  const sig = `${baseUrl}::${publishableKey}`
  if (!_sdk || _sig !== sig) {
    _sdk = new Medusa({
      baseUrl,
      publishableKey,
      fetch: (input: any, init?: any) =>
        fetch(input, { ...(init || {}), signal: init?.signal || AbortSignal.timeout(12000) }),
    })
    _sig = sig
  }
  return _sdk
}
