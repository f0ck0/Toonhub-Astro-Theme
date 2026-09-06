import { model } from "@medusajs/framework/utils"

/**
 * 提示词模板。对应 Spree 的 toonhub_ai_prompt_templates。
 */
export const AiPromptTemplate = model.define("ai_prompt_template", {
  id: model.id({ prefix: "aipt" }).primaryKey(),
  name: model.text().searchable(),
  template_type: model.text(),
  locale: model.text().default("en"),
  system_prompt: model.text().nullable(),
  user_prompt: model.text().nullable(),
  enabled: model.boolean().default(true),
  position: model.number().default(0),
  metadata: model.json().nullable(),
})
