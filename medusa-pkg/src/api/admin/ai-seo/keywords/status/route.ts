import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/keywords/status — 批量更新关键词状态
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const ids = Array.isArray(body.keyword_ids) ? body.keyword_ids.map(String) : []
  const status = String(body.status || "selected")
  if (!ids.length) {
    res.status(400).json({ error: "keyword_ids is required" })
    return
  }
  for (const id of ids) {
    await aiSeo.updateSeoKeywords({ id: id,  status })
  }
  res.json({ updated: ids.length })
}
