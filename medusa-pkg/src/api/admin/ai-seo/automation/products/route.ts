import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/ai-seo/automation/products — 为无文章的产品批量生成文章
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const body = (req.body || {}) as Record<string, unknown>
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 50)

  const products = await productModule.listProducts(
    {},
    { take: limit, select: ["id", "title", "handle", "description"] }
  )
  const sources = products.map((p) => ({ product_id: p.id, title: p.title || "", handle: p.handle || undefined }))

  const task = await aiSeo.createTask({
    task_type: "product_article_generation",
    provider_id: body.provider_id ? String(body.provider_id) : null,
    model: body.model ? String(body.model) : null,
    payload: {
      limit,
      locale: String(body.locale || "en"),
      publish_mode: String(body.publish_mode || "draft"),
      product_sources: sources,
    },
  })
  res.status(202).json({ task, products_queued: sources.length })
}
