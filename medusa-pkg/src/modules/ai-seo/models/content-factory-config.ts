import { model } from "@medusajs/framework/utils"

/**
 * 内容工厂配置(自动化循环)。对应 Spree 的 toonhub_content_factory_configs。
 */
export const ContentFactoryConfig = model.define("content_factory_config", {
  id: model.id({ prefix: "aicf" }).primaryKey(),
  name: model.text().default("default"),
  provider_id: model.text().nullable(),
  model: model.text().nullable(),
  max_rounds: model.number().default(3),
  round_interval_minutes: model.number().default(15),
  articles_per_round: model.number().default(2),
  keywords_per_round: model.number().default(30),
  publish_mode: model.text().default("draft"),
  locale: model.text().default("en"),
  stop_after_hours: model.number().default(0),
  include_optimization: model.boolean().default(true),
  include_internal_links: model.boolean().default(true),
  product_focus: model.boolean().default(true),
  enabled: model.boolean().default(true),
  metadata: model.json().nullable(),
})
