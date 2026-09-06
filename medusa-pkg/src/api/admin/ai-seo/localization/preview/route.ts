import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/ai-seo/localization/preview — 生成产品翻译预览(直接调用 AI)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const body = (req.body || {}) as Record<string, unknown>

  const locales = Array.isArray(body.locales)
    ? body.locales.map(String)
    : String(body.locales || "de").split(",").map((l) => l.trim()).filter(Boolean)
  const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 50)
  const force = body.force === true

  const products = await productModule.listProducts(
    {},
    { take: limit, select: ["id", "title", "description", "material", "subtitle"] }
  )
  const sources = products.map((p) => ({
    product_id: p.id,
    title: p.title || "",
    description: p.description || "",
    material: p.material || null,
    subtitle: p.subtitle || null,
  }))

  const items = await aiSeo.localizationPreview(
    sources,
    locales,
    force,
    body.provider_id ? String(body.provider_id) : null,
    body.model ? String(body.model) : null
  )

  res.json({ items, products_scanned: sources.length })
}
