import type { APIRoute } from "astro"
import { medusaFetch, json } from "../../lib/server-medusa"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    if (!body?.email || !body?.comment) return json({ error: "Email and comment are required" }, 400)

    const payload = {
      name: body.name || "",
      email: body.email,
      phone: body.phone || "",
      comment: body.comment,
      message: body.comment,
    }
    const paths = ["/store/contact", "/store/contact-messages", "/store/inquiries"]
    for (const path of paths) {
      try {
        const { ok, data } = await medusaFetch(path, { method: "POST", body: JSON.stringify(payload) })
        if (ok) return json({ success: true, data })
      } catch { /* next */ }
    }
    return json({
      error: "Medusa has no contact route yet. Add POST /store/contact on the backend.",
    }, 502)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
