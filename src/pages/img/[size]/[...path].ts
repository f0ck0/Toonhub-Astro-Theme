import type { APIRoute } from "astro"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, stat } from "node:fs/promises"
import { dirname, extname, join, normalize, resolve } from "node:path"
import { promisify } from "node:util"

export const prerender = false

const execFileP = promisify(execFile)
const PUBLIC = resolve(process.cwd(), "public")
const CACHE = resolve(process.cwd(), ".astro", "img-cache")

function mime(ext: string) {
  if (ext === ".webp") return "image/webp"
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".png") return "image/png"
  if (ext === ".gif") return "image/gif"
  return "application/octet-stream"
}

export const GET: APIRoute = async ({ params }) => {
  const width = Number(String(params.size || "").replace(/^w/i, ""))
  const rawPath = params.path as string | string[] | undefined
  const rel = (Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath || "")).replace(/^\/+/, "")
  if (!Number.isFinite(width) || width < 32 || width > 1600) {
    return new Response("bad size", { status: 400 })
  }
  const source = normalize(join(PUBLIC, rel))
  if (!source.startsWith(PUBLIC + "/") || source.includes("..")) {
    return new Response("bad path", { status: 400 })
  }
  try {
    await stat(source)
  } catch {
    return new Response("not found", { status: 404 })
  }

  const key = createHash("sha1").update(`${width}:${rel}`).digest("hex")
  const cached = join(CACHE, `${key}.webp`)
  try {
    const buf = await readFile(cached)
    return new Response(buf, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    /* generate */
  }

  await mkdir(dirname(cached), { recursive: true })
  try {
    let made = false
    try {
      const { default: sharp } = await import("sharp")
      await sharp(source)
        .resize(Math.round(width), Math.round(width), { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(cached)
      made = true
    } catch {
      await execFileP("convert", [
        source,
        "-resize",
        `${Math.round(width)}x${Math.round(width)}>`,
        "-quality",
        "72",
        "-define",
        "webp:method=6",
        cached,
      ], { timeout: 15000 })
      made = true
    }
    if (!made) throw new Error("resize failed")
    const buf = await readFile(cached)
    return new Response(buf, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (e) {
    console.error("img resize", rel, e)
    const buf = await readFile(source)
    return new Response(buf, {
      headers: {
        "Content-Type": mime(extname(source).toLowerCase()),
        "Cache-Control": "public, max-age=86400",
      },
    })
  }
}
