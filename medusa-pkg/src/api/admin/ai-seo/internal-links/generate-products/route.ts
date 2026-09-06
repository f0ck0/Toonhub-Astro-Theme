import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/ai-seo/internal-links/generate-products
 * 从产品批量生成内链规则(异步任务,产品快照写入任务 payload)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const body = (req.body || {}) as Record<string, unknown>
  const locale = String(body.locale || "en")
  const limit = Math.min(Math.max(Number(body.limit) || 150, 1), 500)

  const products = await productModule.listProducts(
    {},
    { take: limit, select: ["id", "title", "handle", "description"] }
  )
  const sources = products.map((p) => ({ id: p.id, title: p.title || "", handle: p.handle || undefined }))

  const task = await aiSeo.createTask({
    task_type: "generate_internal_links",
    payload: { locale, limit, product_sources: sources },
  })
  res.status(202).json({ task, products_scanned: sources.length })
}
