import { defineMiddleware } from "astro:middleware"

export const onRequest = defineMiddleware(async (context, next) => {
  const res = await next()
  const headers = new Headers(res.headers)
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("X-Frame-Options", "SAMEORIGIN")
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  const path = context.url.pathname
  if (/\.(woff2|webp|png|jpe?g|svg|ico)$/i.test(path) || path.startsWith("/fonts/") || path.startsWith("/img/")) {
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable")
    }
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
})
