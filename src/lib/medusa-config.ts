import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import Medusa from "@medusajs/js-sdk"

/** Live Medusa backend. */
export const DEFAULT_MEDUSA_URL = "https://medusa.toonhubshop.com"
/** Publishable keys are meant for the storefront; also set in .env */
export const DEFAULT_PUBLISHABLE_KEY = "pk_7b55f85cfbc0b36baa03e4f3914732c2f5f9d8fc5ae3bb50a98e01d6fcc73c4b"

function loadDotEnv() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env"), "utf8")
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith("#")) continue
      const eq = line.indexOf("=")
      if (eq < 1) continue
      const key = line.slice(0, eq).trim()
      let val = line.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      process.env[key] = val
    }
  } catch { /* no .env file */ }
}
loadDotEnv()

export function medusaConfig() {
  const baseUrl = String(
    import.meta.env.MEDUSA_URL ||
    import.meta.env.PUBLIC_MEDUSA_URL ||
    process.env.MEDUSA_URL ||
    process.env.PUBLIC_MEDUSA_URL ||
    DEFAULT_MEDUSA_URL,
  ).replace(/\/$/, "")
  const publishableKey = String(
    import.meta.env.MEDUSA_PUBLISHABLE_KEY ||
    import.meta.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    DEFAULT_PUBLISHABLE_KEY,
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
        fetch(input, { ...(init || {}), signal: init?.signal || AbortSignal.timeout(15000) }),
    })
    _sig = sig
  }
  return _sdk
}
