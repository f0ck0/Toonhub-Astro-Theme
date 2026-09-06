import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"
import { TRANSLATION_MODULE } from "@medusajs/translation"

/**
 * POST /admin/ai-seo/localization/apply — 应用翻译预览结果(写入 translation 模块)
 * body: { items: [{ product_id, locale, title, description, subtitle, material, meta_title, meta_description, meta_keywords }] }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const translationModule = req.scope.resolve(TRANSLATION_MODULE)
  const body = (req.body || {}) as Record<string, unknown>
  const items = Array.isArray(body.items) ? body.items : []

  let applied = 0
  let failed = 0
  const errors: string[] = []

  for (const item of items as Array<Record<string, unknown>>) {
    try {
      const ok = await aiSeo.persistLocalization(
        {
          product_id: String(item.product_id),
          locale: String(item.locale),
          title: String(item.title || ""),
          description: String(item.description || ""),
          subtitle: item.subtitle ? String(item.subtitle) : null,
          material: item.material ? String(item.material) : null,
          meta_title: item.meta_title ? String(item.meta_title) : null,
          meta_description: item.meta_description ? String(item.meta_description) : null,
          meta_keywords: item.meta_keywords ? String(item.meta_keywords) : null,
        },
        { translationService: translationModule }
      )
      if (ok) applied += 1
      else failed += 1
    } catch (error) {
      failed += 1
      errors.push(`product=${item.product_id} locale=${item.locale}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  res.json({ applied, skipped: 0, failed, errors: errors.slice(0, 50) })
}
