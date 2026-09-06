import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  const article = await aiSeo.retrieveAiArticle(id)
  res.json({ article })
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  const body = (req.body || {}) as Record<string, unknown>
  const updateData: Record<string, unknown> = {}
  for (const key of [
    "title", "summary", "content", "seo_title", "seo_description", "seo_keywords",
  ]) {
    if (body[key] !== undefined) updateData[key] = body[key] ? String(body[key]) : null
  }
  if (body.keywords !== undefined) updateData.keywords = Array.isArray(body.keywords) ? body.keywords.map(String) : null
  if (body.status !== undefined) updateData.status = String(body.status)

  const article = await aiSeo.updateAiArticles({ id: id, ...updateData })
  res.json({ article })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  await aiSeo.deleteAiArticles(id)
  res.status(200).json({ deleted: true })
}
