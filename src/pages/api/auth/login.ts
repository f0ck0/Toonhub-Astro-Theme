import type { APIRoute } from "astro"
import { medusaFetch, json } from "../../../lib/server-medusa"

export const prerender = false

function tokenOf(data: any): string {
  if (!data) return ""
  if (typeof data === "string") return data
  return data.token || data.access_token || (typeof data.raw === "string" ? data.raw : "")
}

function errMessage(data: any, fallback: string) {
  return data?.message || data?.error || data?.errors?.[0]?.message || fallback
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password, mode, first_name, last_name } = await request.json()
    if (!email || !password) return json({ error: "Email and password are required" }, 400)
    if (String(password).length < 8) return json({ error: "Password must be at least 8 characters" }, 400)

    if (mode === "register") {
      const reg = await medusaFetch("/auth/customer/emailpass/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      const regToken = tokenOf(reg.data)
      if (reg.ok && regToken) {
        await medusaFetch(
          "/store/customers",
          { method: "POST", body: JSON.stringify({ email, first_name: first_name || "", last_name: last_name || "" }) },
          { Authorization: `Bearer ${regToken}` },
        )
      } else if (reg.status !== 401 && !/already|exist/i.test(errMessage(reg.data, ""))) {
        // continue to login if the email is already registered
        if (!reg.ok && !/identit|exist|registered|already/i.test(errMessage(reg.data, ""))) {
          return json({ error: errMessage(reg.data, "Could not create account") }, 400)
        }
      }
    }

    const login = await medusaFetch("/auth/customer/emailpass", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    const token = tokenOf(login.data)
    if (!login.ok || !token) {
      return json({ error: errMessage(login.data, "Invalid email or password") }, 401)
    }

    let customer: any = null
    try {
      const me = await medusaFetch("/store/customers/me", {}, { Authorization: `Bearer ${token}` })
      if (me.ok) customer = me.data?.customer || me.data
    } catch { /* token is enough */ }

    return json({ token, email, customer })
  } catch (e: any) {
    return json({ error: e.message || "Login failed" }, 401)
  }
}

export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get("authorization") || ""
  if (!auth) return json({ error: "Not signed in" }, 401)
  try {
    const me = await medusaFetch("/store/customers/me", {}, { Authorization: auth })
    if (!me.ok) return json({ error: errMessage(me.data, "Session expired") }, 401)
    return json({ customer: me.data?.customer || me.data })
  } catch (e: any) {
    return json({ error: e.message || "Session expired" }, 401)
  }
}
