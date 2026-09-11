import type { APIRoute } from "astro"
import { medusaFetch, json, errorMessage, medusaErrorMessage } from "../../lib/server-medusa"

export const prerender = false

/** 行为分析上报代理:浏览器 → 本路由 → Medusa /store/behavior(服务端持有 publishable key) */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { ok, data } = await medusaFetch<{ success?: boolean }>("/store/behavior", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!ok) return json({ error: medusaErrorMessage(data, "Could not record behavior") }, 400)
    return json({ success: true })
  } catch (e) {
    return json({ error: errorMessage(e, "Could not record behavior") }, 500)
  }
}
