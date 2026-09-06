import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/ai-seo/localization/queue — 排队串行本地化任务(异步,逐个翻译并落库)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const body = (req.body || {}) as Record<string, unknown>

  const locales = Array.isArray(body.locales)
    ? body.locales.map(String)
    : String(body.locales || "de").split(",").map((l) => l.trim()).filter(Boolean)
  const locale = locales[0] || "de"
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 200)
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

  const task = await aiSeo.createTask({
    task_type: "product_localization_direct_serial",
    provider_id: body.provider_id ? String(body.provider_id) : null,
    model: body.model ? String(body.model) : null,
    payload: { locale, locales, force, limit, product_sources: sources },
  })
  res.status(202).json({ task, products_queued: sources.length })
}
