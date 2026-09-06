import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/tasks/clear — 清空已完成/失败/取消的任务
 * scope: completed | failed | cancelled | all
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const scope = String(body.scope || "all") as "completed" | "failed" | "cancelled" | "all"
  const deleted = await aiSeo.clearTasks(scope)
  res.json({ deleted })
}
