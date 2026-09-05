import type { APIRoute } from "astro"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    if (!body?.email || !body?.comment) {
      return new Response(JSON.stringify({ error: "Email and comment are required" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
