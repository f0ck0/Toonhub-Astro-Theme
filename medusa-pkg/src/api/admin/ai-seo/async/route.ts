import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/ai-seo/async — 异步 AI SEO 管道
 * action: full | score_recent | optimize_low | internal_links
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const body = (req.body || {}) as Record<string, unknown>
  const action = String(body.action || "full")
  const locale = String(body.locale || "en")

  const productLimit = action === "full" ? 500 : Math.min(Math.max(Number(body.product_rules_minimum) || 150, 1), 500)
  const products = await productModule.listProducts(
    {},
    { take: productLimit, select: ["id", "title", "handle"] }
  )
  const sources = products.map((p) => ({ id: p.id, title: p.title || "", handle: p.handle || undefined }))

  let taskType = "full_pipeline"
  if (action === "score_recent") taskType = "rescore_recent"
  else if (action === "optimize_low") taskType = "optimize_low"
  else if (action === "internal_links") taskType = "generate_internal_links"

  const task = await aiSeo.createTask({
    task_type: taskType,
    payload: {
      locale,
      limit: Number(body.limit) || 50,
      product_sources: sources,
    },
  })
  res.status(202).json({ task, action, products_scanned: sources.length })
}
