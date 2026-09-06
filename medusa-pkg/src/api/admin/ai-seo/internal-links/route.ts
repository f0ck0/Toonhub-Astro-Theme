import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [rules, count] = await aiSeo.listAndCountAiInternalLinkRules(
    {},
    { take: 1000, order: { priority: "DESC", created_at: "DESC" } }
  )
  const [, usageCount] = await aiSeo.listAndCountAiInternalLinkUsages({})
  res.json({ rules, count, usage_count: usageCount })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const anchorText = String(body.anchor_text || "").trim()
  const targetUrl = String(body.target_url || "").trim()
  if (!anchorText || !targetUrl) {
    res.status(400).json({ error: "anchor_text and target_url are required" })
    return
  }

  const existing = await aiSeo.listAiInternalLinkRules(
    { anchor_text: anchorText, target_url: targetUrl, locale: String(body.locale || "en") },
    { take: 1 }
  )
  const data = {
    anchor_text: anchorText,
    target_url: targetUrl,
    target_type: body.target_type ? String(body.target_type) : "custom",
    target_id: body.target_id ? String(body.target_id) : null,
    source_type: String(body.source_type || "manual"),
    locale: String(body.locale || "en"),
    priority: Number(body.priority) || 50,
    max_insertions: Number(body.max_insertions) || 1,
    enabled: body.enabled !== false,
    auto_generated: body.auto_generated === true,
    notes: body.notes ? String(body.notes) : null,
  }

  if (existing.length) {
    const rule = await aiSeo.updateAiInternalLinkRules({ id: existing[0].id, ...data })
    res.json({ rule, updated: true })
    return
  }
  const rule = await aiSeo.createAiInternalLinkRules(data)
  res.status(201).json({ rule, updated: false })
}
