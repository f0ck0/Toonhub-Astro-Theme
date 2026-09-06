import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"
import { SecretBox } from "../../../../../modules/ai-seo/services/secret-box"

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  const body = (req.body || {}) as Record<string, unknown>

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = String(body.name)
  if (body.provider_type !== undefined) updateData.provider_type = String(body.provider_type)
  if (body.base_url !== undefined) updateData.base_url = body.base_url ? String(body.base_url) : null
  if (body.default_model !== undefined) updateData.default_model = body.default_model ? String(body.default_model) : null
  if (body.enabled !== undefined) updateData.enabled = body.enabled === true
  if (body.api_key) updateData.encrypted_api_key = SecretBox.encrypt(String(body.api_key))

  const provider = await aiSeo.updateAiProviders({ id: id, ...updateData })
  res.json({ provider })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  await aiSeo.deleteAiProviders(id)
  res.status(200).json({ deleted: true })
}
