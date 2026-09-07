import type { APIRoute } from "astro"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, stat } from "node:fs/promises"
import { dirname, extname, join, normalize, resolve } from "node:path"
import { promisify } from "node:util"

/**
 * `/img/w{size}/{path}` — on-the-fly resizer for `public/` artwork.
 *
 * `astro:assets` only optimises files imported from `src/`, so catalogue images
 * that live in `public/images/**` are served from here instead. It emits AVIF
 * (`?fmt=avif`) or WebP (default) at the requested width, caches the result on
 * disk under `.astro/img-cache` and answers with immutable cache headers.
 *
 * Security: the resolved path must stay inside `public/`, and every input is
 * range-checked before touching the filesystem.
 */

export const prerender = false

const execFileP = promisify(execFile)
const PUBLIC_DIR = resolve(process.cwd(), "public")
const CACHE_DIR = resolve(process.cwd(), ".astro", "img-cache")

type Format = "webp" | "avif" | "jpg"

const MIME: Record<Format, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpg: "image/jpeg",
}

const MIN_WIDTH = 32
const MAX_WIDTH = 2400
const QUALITY = 72

function mimeFor(ext: string): string {
  const table: Record<string, string> = {
    ".webp": MIME.webp,
    ".avif": MIME.avif,
    ".jpg": MIME.jpg,
    ".jpeg": MIME.jpg,
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  }
  return table[ext] || "application/octet-stream"
}

function parseFormat(raw: unknown): Format {
  const value = String(raw ?? "").toLowerCase()
  if (value === "avif") return "avif"
  if (value === "jpg" || value === "jpeg") return "jpg"
  return "webp"
}

function immutableHeaders(format: Format, etag: string): HeadersInit {
  return {
    "Content-Type": MIME[format],
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${etag}"`,
    Vary: "Accept",
  }
}

export const GET: APIRoute = async ({ params, request, url }) => {
  const width = Math.round(Number(String(params.size || "").replace(/^w/i, "")))
  const rawPath = params.path as string | string[] | undefined
  const rel = (Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath || "")).replace(
    /^\/+/,
    "",
  )

  if (!Number.isFinite(width) || width < MIN_WIDTH || width > MAX_WIDTH) {
    return new Response(`width must be ${MIN_WIDTH}-${MAX_WIDTH}px`, { status: 400 })
  }
  if (!rel) return new Response("missing path", { status: 400 })

  const source = normalize(join(PUBLIC_DIR, rel))
  if (source !== PUBLIC_DIR && !source.startsWith(PUBLIC_DIR + "/")) {
    return new Response("bad path", { status: 403 })
  }
  if (/\0/.test(source)) return new Response("bad path", { status: 400 })

  let format = parseFormat(url.searchParams.get("fmt"))
  // Honour content negotiation when the caller did not pin a format.
  if (!url.searchParams.get("fmt")) {
    const accept = request.headers.get("accept") || ""
    if (accept.includes("image/avif")) format = "avif"
  }

  try {
    const info = await stat(source)
    if (!info.isFile()) return new Response("not a file", { status: 404 })
  } catch {
    return new Response("not found", { status: 404 })
  }

  const key = createHash("sha1").update(`${width}:${format}:${rel}`).digest("hex")
  const cached = join(CACHE_DIR, `${key}.${format}`)
  const etag = `${key.slice(0, 16)}-${width}`

  if (request.headers.get("if-none-match") === `"${etag}"`) {
    return new Response(null, { status: 304, headers: immutableHeaders(format, etag) })
  }

  try {
    const buf = await readFile(cached)
    return new Response(buf, { headers: immutableHeaders(format, etag) })
  } catch {
    /* not generated yet */
  }

  await mkdir(dirname(cached), { recursive: true })

  try {
    const { default: sharp } = await import("sharp")
    const pipeline = sharp(source, { failOn: "none" })
      .resize({ width, withoutEnlargement: true, fit: "inside" })
      .rotate()
    if (format === "avif") await pipeline.avif({ quality: QUALITY - 8, effort: 4 }).toFile(cached)
    else if (format === "jpg") await pipeline.jpeg({ quality: QUALITY + 8, mozjpeg: true }).toFile(cached)
    else await pipeline.webp({ quality: QUALITY }).toFile(cached)

    const buf = await readFile(cached)
    return new Response(buf, { headers: immutableHeaders(format, etag) })
  } catch (sharpError) {
    // ImageMagick fallback keeps the endpoint alive when sharp can't load.
    try {
      const encoderHint =
        format === "avif"
          ? "avif:speed=6"
          : format === "webp"
            ? "webp:method=6"
            : "jpeg:extent=400kb"
      await execFileP(
        "convert",
        [
          source,
          "-auto-orient",
          "-resize",
          `${width}>`,
          "-quality",
          String(QUALITY),
          "-define",
          encoderHint,
          cached,
        ],
        { timeout: 20000 },
      )
      const buf = await readFile(cached)
      return new Response(buf, { headers: immutableHeaders(format, etag) })
    } catch {
      console.error("[img] resize failed, serving source:", rel, sharpError)
      try {
        const buf = await readFile(source)
        return new Response(buf, {
          headers: {
            "Content-Type": mimeFor(extname(source).toLowerCase()),
            "Cache-Control": "public, max-age=86400",
          },
        })
      } catch {
        return new Response("not found", { status: 404 })
      }
    }
  }
}
