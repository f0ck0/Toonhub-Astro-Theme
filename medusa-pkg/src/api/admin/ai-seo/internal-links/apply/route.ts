import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/internal-links/apply — 为指定文章注入内链
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  if (!body.article_id) {
    res.status(400).json({ error: "article_id is required" })
    return
  }
  const result = await aiSeo.applyInternalLinks(String(body.article_id))
  res.json({ result })
}
