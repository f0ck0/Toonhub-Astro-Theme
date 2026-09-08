// 预生成 /img/w{size} 端点所需的产品图片变体,写入 .astro/img-cache
// 缓存键必须与 src/pages/img/[size]/[...path].ts 完全一致:
//   sha1(`${width}:${format}:q${QUALITY}:${rel}`) → .astro/img-cache/{key}.{format}
// 增量执行:已存在且非空的变体跳过。用法:node scripts/prewarm-images.mjs
import { createHash } from "node:crypto"
import { stat, readdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC_DIR = path.join(ROOT, "public")
const CACHE_DIR = path.join(ROOT, ".astro", "img-cache")
const QUALITY = 80 // 必须与端点常量一致
const WIDTHS = [240, 360, 480, 700, 720, 1080, 1440] // card + hero 阶梯并集
const FORMATS = ["avif", "webp"]
const DIRS = ["images/products", "images/reviews", "images/collection", "images/og"]
const CONCURRENCY = 8
const EXT_RE = /\.(jpe?g|png|webp)$/i

async function collect(dir, base) {
  const out = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await collect(full, base)))
    else if (e.isFile() && EXT_RE.test(e.name)) out.push(full)
  }
  return out
}

function cacheKey(width, format, rel) {
  return createHash("sha1").update(`${width}:${format}:q${QUALITY}:${rel}`).digest("hex")
}

async function generate(file, rel) {
  for (const width of WIDTHS) {
    for (const format of FORMATS) {
      const key = cacheKey(width, format, rel)
      const out = path.join(CACHE_DIR, `${key}.${format}`)
      try {
        const st = await stat(out)
        if (st.size > 0) continue
      } catch {
        /* generate */
      }
      const src = sharp(file, { failOn: "none" })
        .resize({ width, withoutEnlargement: true, fit: "inside", kernel: "lanczos3" })
        .rotate()
      if (format === "avif") await src.avif({ quality: QUALITY - 8, effort: 4 }).toFile(out)
      else await src.webp({ quality: QUALITY, smartSubsample: true }).toFile(out)
    }
  }
}

async function main() {
  const t0 = Date.now()
  let files = []
  for (const d of DIRS) files.push(...(await collect(path.join(PUBLIC_DIR, d), PUBLIC_DIR)))
  console.log(`[prewarm] 待处理图片: ${files.length} (宽度 ${WIDTHS.join("/")} × 格式 ${FORMATS.join("/")})`)

  let done = 0
  const queue = files.map((f) => ({ f, rel: path.relative(PUBLIC_DIR, f).split(path.sep).join("/") }))
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const { f, rel } = queue.pop()
      try {
        await generate(f, rel)
      } catch (e) {
        console.error(`[prewarm] 失败 ${rel}:`, String(e).slice(0, 120))
      }
      done++
      if (done % 200 === 0) {
        const per = (Date.now() - t0) / done
        console.log(`[prewarm] ${done}/${files.length} 完成,剩余约 ${Math.round((files.length - done) * per / 1000 / 60)} 分钟`)
      }
    }
  })
  await Promise.all(workers)
  console.log(`[prewarm] 全部完成: ${files.length} 张,耗时 ${Math.round((Date.now() - t0) / 1000)}s`)
}

main().catch((e) => { console.error(e); process.exit(1) })
