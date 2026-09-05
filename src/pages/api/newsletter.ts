import type { APIRoute } from "astro"
import { medusaFetch, json } from "../../lib/server-medusa"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json()
    if (!email || !String(email).includes("@")) return json({ error: "Valid email required" }, 400)

    const bodies = [
      { path: "/store/newsletter-subscribers", body: { email } },
      { path: "/store/subscribers", body: { email } },
      { path: "/store/newsletter", body: { email } },
      { path: "/store/email-subscribers", body: { email, source: "storefront" } },
    ]
    let reached = false
    for (const b of bodies) {
      try {
        const { ok, status, data } = await medusaFetch(b.path, { method: "POST", body: JSON.stringify(b.body) })
        reached = true
        if (ok) return json({ success: true, data })
        if (status >= 500) return json({ error: data?.message || "Medusa newsletter error" }, 502)
      } catch { /* try next Medusa route */ }
    }
    return json({
      error: reached
        ? "Medusa has no newsletter route yet. Add POST /store/newsletter-subscribers { email } on the backend."
        : "Could not reach Medusa. Check MEDUSA_URL.",
    }, 502)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
