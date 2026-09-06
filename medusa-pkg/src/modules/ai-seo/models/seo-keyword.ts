import { model } from "@medusajs/framework/utils"

/**
 * SEO 关键词。对应 Spree 的 toonhub_seo_keywords。
 * keyword_type: primary | long_tail | question | related | product | category | competitor
 * status: new | selected | used | ignored | published
 */
export const SeoKeyword = model
  .define("seo_keyword", {
    id: model.id({ prefix: "aikw" }).primaryKey(),
    keyword: model.text().searchable(),
    keyword_type: model.text().default("primary"),
    locale: model.text().default("en").searchable(),
    priority: model.number().default(0),
    status: model.text().default("new").searchable(),
    source: model.text().nullable(),
    article_id: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_seo_keyword_keyword_locale",
      on: ["keyword", "locale"],
      unique: true,
    },
  ])
