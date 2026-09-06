import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * GET /store/ai-seo/articles/:slug — 公开文章详情(仅 published)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { slug } = req.params as { slug: string }
  const locale = (req.query.locale as string) || "en"
  const articles = await aiSeo.listAiArticles({ slug, locale, status: "published" }, { take: 1 })
  if (!articles.length) {
    res.status(404).json({ message: "Article not found" })
    return
  }
  const article = articles[0]
  res.json({
    data: {
      id: article.id,
      title: article.title,
      slug: article.slug,
      locale: article.locale,
      summary: article.summary,
      content: article.content,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
      seo_keywords: article.seo_keywords,
      keywords: article.keywords,
      published_at: article.published_at,
      updated_at: article.updated_at,
    },
  })
}
