import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/articles/:id/queue-ai — 为文章排入 AI 任务
 * task_type: keywords | optimize_article | rewrite_title | rewrite_summary | translate | polish
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  const body = (req.body || {}) as Record<string, unknown>
  const taskType = String(body.task_type || "")

  const allowed = ["keywords", "optimize_article", "rewrite_title", "rewrite_summary", "translate", "polish"]
  if (!allowed.includes(taskType)) {
    res.status(400).json({ error: `task_type must be one of: ${allowed.join(", ")}` })
    return
  }

  const task = await aiSeo.createTask({
    task_type: taskType,
    article_id: id,
    provider_id: body.provider_id ? String(body.provider_id) : null,
    model: body.model ? String(body.model) : null,
    payload: body.target_locale ? { target_locale: String(body.target_locale) } : {},
  })
  res.status(202).json({ task })
}
