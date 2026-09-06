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

function setSessionCookies(cookies: any, token: string, email: string) {
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" as const }
  if (token) cookies.set("toonhub_token", token, opts)
  if (email) cookies.set("toonhub_email", email, opts)
  cookies.set("toonhub_signed_in", "1", opts)
}

export const POST: APIRoute = async ({ request, cookies }) => {
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

    setSessionCookies(cookies, token, email)
    return json({ token, email, customer })
  } catch (e: any) {
    return json({ error: e.message || "Login failed" }, 401)
  }
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const header = request.headers.get("authorization") || ""
  const cookieToken = cookies.get("toonhub_token")?.value || ""
  const auth = header || (cookieToken ? `Bearer ${cookieToken}` : "")
  if (!auth) return json({ error: "Not signed in" }, 401)
  try {
    const me = await medusaFetch("/store/customers/me", {}, { Authorization: auth })
    if (me.status === 401 || me.status === 403) return json({ error: errMessage(me.data, "Could not refresh profile"), keep_local: true }, 200)
    if (!me.ok) return json({ error: errMessage(me.data, "Could not load account"), keep_local: true }, 200)
    return json({ customer: me.data?.customer || me.data })
  } catch (e: any) {
    return json({ error: e.message || "Could not reach store", keep_local: true }, 200)
  }
}
