import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/articles/bulk — 批量操作: publish | delete
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const ids = Array.isArray(body.article_ids) ? body.article_ids.map(String) : []
  const action = String(body.action || "")

  if (!ids.length) {
    res.status(400).json({ error: "article_ids is required" })
    return
  }

  if (action === "publish") {
    const task = await aiSeo.createTask({ task_type: "bulk_publish", payload: { article_ids: ids } })
    res.status(202).json({ task })
    return
  }
  if (action === "delete") {
    const task = await aiSeo.createTask({ task_type: "bulk_delete", payload: { article_ids: ids } })
    res.status(202).json({ task })
    return
  }

  res.status(400).json({ error: "action must be publish or delete" })
}
