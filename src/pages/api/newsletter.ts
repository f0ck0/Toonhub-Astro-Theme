import type { APIRoute } from "astro"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json()
    if (!email || !String(email).includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email required" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
