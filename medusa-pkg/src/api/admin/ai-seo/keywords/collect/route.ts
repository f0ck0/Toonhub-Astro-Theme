import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/keywords/collect — AI 收集关键词(创建任务,异步)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  if (!body.seed) {
    res.status(400).json({ error: "seed is required" })
    return
  }
  const task = await aiSeo.createTask({
    task_type: "collect_keywords",
    provider_id: body.provider_id ? String(body.provider_id) : null,
    model: body.model ? String(body.model) : null,
    payload: {
      seed: String(body.seed),
      locale: String(body.locale || "en"),
      count: Number(body.count) || 50,
      source: "admin_keyword_center",
    },
  })
  res.status(202).json({ task })
}
