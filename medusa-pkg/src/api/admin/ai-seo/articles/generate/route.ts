import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/articles/generate — 用 AI 生成文章并创建任务(异步)。
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>

  const payload: Record<string, unknown> = {
    topic: body.topic ? String(body.topic) : undefined,
    locale: body.locale ? String(body.locale) : "en",
    tone: body.tone ? String(body.tone) : undefined,
    length: body.length ? String(body.length) : undefined,
    keywords: Array.isArray(body.keywords)
      ? body.keywords.map(String)
      : body.keywords
        ? String(body.keywords).split(/[,;\n]/).map((k) => k.trim()).filter(Boolean)
        : [],
    publish_now: body.publish_now === true || body.publish_now === "true",
    article_id: body.article_id ? String(body.article_id) : undefined,
  }

  const task = await aiSeo.createTask({
    task_type: "generate_article",
    payload,
    provider_id: body.provider_id ? String(body.provider_id) : null,
    model: body.model ? String(body.model) : null,
  })
  res.status(202).json({ task })
}
