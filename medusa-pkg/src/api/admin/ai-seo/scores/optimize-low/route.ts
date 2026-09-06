import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/scores/optimize-low — 批量优化低分文章(异步任务)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const task = await aiSeo.createTask({
    task_type: "optimize_low",
    payload: { limit: Number(body.limit) || 50 },
  })
  res.status(202).json({ task })
}
