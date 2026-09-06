import { model } from "@medusajs/framework/utils"

/**
 * 内链规则(锚文本 → 目标 URL)。对应 Spree 的 toonhub_ai_internal_link_rules。
 */
export const AiInternalLinkRule = model
  .define("ai_internal_link_rule", {
    id: model.id({ prefix: "ailr" }).primaryKey(),
    anchor_text: model.text().searchable(),
    target_url: model.text().searchable(),
    target_type: model.text().nullable(),
    target_id: model.text().nullable(),
    source_type: model.text().default("manual"),
    locale: model.text().default("en"),
    priority: model.number().default(50),
    max_insertions: model.number().default(1),
    usage_count: model.number().default(0),
    last_used_at: model.dateTime().nullable(),
    enabled: model.boolean().default(true),
    auto_generated: model.boolean().default(false),
    notes: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_ai_internal_link_rule_enabled",
      on: ["enabled"],
    },
  ])
