import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/automation — 自动化流水线(种子 → 关键词 → 文章)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  if (!body.seed) {
    res.status(400).json({ error: "seed is required" })
    return
  }
  const task = await aiSeo.createTask({
    task_type: "automation_pipeline",
    provider_id: body.provider_id ? String(body.provider_id) : null,
    model: body.model ? String(body.model) : null,
    payload: {
      seed: String(body.seed),
      locale: String(body.locale || "en"),
      publish_mode: String(body.publish_mode || "draft"),
      keyword_count: Number(body.keyword_count) || 30,
      articles_per_round: Number(body.articles_per_round) || 2,
      product_focus: body.product_focus !== false,
    },
  })
  res.status(202).json({ task })
}
