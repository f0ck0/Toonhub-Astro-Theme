import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  const body = (req.body || {}) as Record<string, unknown>
  const updateData: Record<string, unknown> = {}
  for (const key of ["name", "template_type", "locale", "system_prompt", "user_prompt"]) {
    if (body[key] !== undefined) updateData[key] = body[key] ? String(body[key]) : null
  }
  if (body.enabled !== undefined) updateData.enabled = body.enabled === true
  if (body.position !== undefined) updateData.position = Number(body.position)
  const template = await aiSeo.updateAiPromptTemplates({ id: id, ...updateData })
  res.json({ template })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  await aiSeo.deleteAiPromptTemplates(id)
  res.status(200).json({ deleted: true })
}
