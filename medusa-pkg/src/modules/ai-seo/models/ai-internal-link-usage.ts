import { model } from "@medusajs/framework/utils"

/**
 * 内链使用记录。对应 Spree 的 toonhub_ai_internal_link_usages。
 */
export const AiInternalLinkUsage = model.define("ai_internal_link_usage", {
  id: model.id({ prefix: "ailu" }).primaryKey(),
  rule_id: model.text().nullable(),
  article_id: model.text().nullable(),
  anchor_text: model.text().nullable(),
  target_url: model.text().nullable(),
  locale: model.text().nullable(),
  insertions_count: model.number().default(0),
  metadata: model.json().nullable(),
})
