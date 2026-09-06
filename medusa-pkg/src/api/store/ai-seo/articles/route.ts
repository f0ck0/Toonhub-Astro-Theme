import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"

/**
 * GET /store/ai-seo/articles — 公开文章列表(仅 published)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const locale = (req.query.locale as string) || "en"
  const [articles, count] = await aiSeo.listAndCountAiArticles(
    { status: "published", locale },
    { take: 200, order: { published_at: "DESC" } }
  )
  res.json({
    data: articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      locale: a.locale,
      summary: a.summary,
      seo_title: a.seo_title,
      seo_description: a.seo_description,
      keywords: a.keywords,
      published_at: a.published_at,
      updated_at: a.updated_at,
    })),
    count,
  })
}
