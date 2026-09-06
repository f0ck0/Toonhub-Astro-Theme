import type { APIRoute } from "astro"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { medusaFetch, json } from "../../lib/server-medusa"

export const prerender = false

function saveLocal(email: string) {
  const dir = resolve(process.cwd(), "data")
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, "newsletter.json")
  let list: string[] = []
  try { list = JSON.parse(readFileSync(file, "utf8")) } catch { list = [] }
  const e = email.toLowerCase()
  if (!list.includes(e)) list.push(e)
  writeFileSync(file, JSON.stringify(list, null, 2))
  return list.length
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json()
    if (!email || !String(email).includes("@")) return json({ error: "Valid email required" }, 400)
    const value = String(email).trim().toLowerCase()

    const bodies = [
      { path: "/store/newsletter-subscribers", body: { email: value } },
      { path: "/store/subscribers", body: { email: value } },
      { path: "/store/newsletter", body: { email: value } },
      { path: "/store/email-subscribers", body: { email: value, source: "storefront" } },
    ]
    for (const b of bodies) {
      try {
        const { ok, status, data } = await medusaFetch(b.path, { method: "POST", body: JSON.stringify(b.body) })
        if (ok || status === 409) {
          saveLocal(value)
          return json({ success: true, data })
        }
      } catch { /* try next */ }
    }

    saveLocal(value)
    return json({ success: true, stored: "local" })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
