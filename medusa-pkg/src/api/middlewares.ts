import { defineMiddlewares } from "@medusajs/framework/http"
import { existsSync, statSync } from "node:fs"
import { join, normalize } from "node:path"

/**
 * 商品图片静态服务:
 * 数据库 thumbnail 存的是 /images/... 路径, 图片文件实际位于 Astro 前端的 public/images。
 * Medusa 的 matcher 会作为挂载点剥离 req.url, 故用 originalUrl 还原完整路径,
 * 手动校验后以 sendFile 直接回传, 后台商品列表/详情即可正常显示图片。
 * 图片目录可通过环境变量 TOONHUB_IMAGES_DIR 覆盖。
 */
const imagesDir =
  process.env.TOONHUB_IMAGES_DIR ||
  "/opt/1panel/www/sites/toonhubshop.com/index/public"

const staticImages = (req, res, next) => {
  const rel = req.originalUrl.replace(/^\/images\//, "")
  // 防目录穿越: 归一化后必须仍在 images 目录内
  const file = normalize(join(imagesDir, "images", rel))
  if (!file.startsWith(normalize(join(imagesDir, "images")))) return next()
  if (existsSync(file) && statSync(file).isFile()) {
    res.setHeader(
      "Cache-Control",
      "public, max-age=2592000, stale-while-revalidate=604800"
    )
    return res.sendFile(file)
  }
  return next()
}

/**
 * 默认简体中文:dashboard 的 i18n 通过 `lng` cookie 初始化语言。
 * 用户未显式选择语言时,下发 lng=zhCN,使管理后台默认即为中文界面。
 * 若用户已手动选择过其他语言(cookie 已存在),则不覆盖其选择。
 */
const defaultZhCN = (req, res, next) => {
  if (!req.cookies?.lng) {
    res.cookie("lng", "zhCN", {
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: "lax",
    })
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/images/*",
      middlewares: [staticImages],
    },
    {
      matcher: /^\/app(\/.*)?$/,
      method: ["GET"],
      middlewares: [defaultZhCN],
    },
  ],
})
