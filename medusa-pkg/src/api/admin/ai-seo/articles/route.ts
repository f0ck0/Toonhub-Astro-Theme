import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const status = req.query.status as string | undefined
  const filters = status ? { status } : {}
  const [articles, count] = await aiSeo.listAndCountAiArticles(
    filters,
    { take: 300, order: { updated_at: "DESC" } }
  )
  res.json({ articles, count })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const article = await aiSeo.createArticle({
    title: String(body.title || "Untitled"),
    slug: body.slug ? String(body.slug) : undefined,
    locale: body.locale ? String(body.locale) : "en",
    summary: body.summary ? String(body.summary) : undefined,
    content: body.content ? String(body.content) : undefined,
    seo_title: body.seo_title ? String(body.seo_title) : undefined,
    seo_description: body.seo_description ? String(body.seo_description) : undefined,
    seo_keywords: body.seo_keywords ? String(body.seo_keywords) : undefined,
    keywords: Array.isArray(body.keywords) ? body.keywords.map(String) : undefined,
    status: body.status ? String(body.status) : "draft",
  })
  res.status(201).json({ article })
}
