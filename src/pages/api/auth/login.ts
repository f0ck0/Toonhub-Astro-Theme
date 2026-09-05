import type { APIRoute } from "astro"
import { getStoreSdk } from "../../../lib/medusa-config"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password, mode } = await request.json()
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
    const medusa = getStoreSdk()
    if (mode === "register") {
      // 注册: Medusa 2.x 两步流程 —— 1) register 拿注册 token(含 auth_identity_id, 无 actor)
      // 2) store.customer.create 创建顾客记录并绑定该身份; 若邮箱已存在则忽略,继续走登录
      try {
        await medusa.auth.register("customer", "emailpass", { email, password })
        await medusa.store.customer.create({ email, password })
      } catch (e: any) {
        // 若已存在或并发注册失败则忽略,继续走登录
      }
    }
    const { token } = await medusa.auth.login("customer", "emailpass", { email, password })
    if (!token) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({ token, email }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Login failed" }), { status: 401, headers: { "Content-Type": "application/json" } })
  }
}