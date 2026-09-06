import { model } from "@medusajs/framework/utils"

/**
 * SEO 文章。对应 Spree 的 toonhub_articles。
 */
export const AiArticle = model
  .define("ai_article", {
    id: model.id({ prefix: "aiar" }).primaryKey(),
    title: model.text().searchable(),
    slug: model.text().searchable(),
    locale: model.text().default("en").searchable(),
    summary: model.text().nullable(),
    content: model.text().nullable(),
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
    seo_keywords: model.text().nullable(),
    keywords: model.json().nullable(),
    status: model.text().default("draft").searchable(),
    published_at: model.dateTime().nullable(),
    scheduled_at: model.dateTime().nullable(),
    seo_score: model.number().nullable(),
    quality_status: model.text().nullable(),
    optimization_status: model.text().nullable(),
    optimization_notes: model.text().nullable(),
    optimization_attempts: model.number().default(0),
    last_optimized_at: model.dateTime().nullable(),
    source_product_id: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_ai_article_slug_locale",
      on: ["slug", "locale"],
      unique: true,
    },
    {
      name: "IDX_ai_article_status",
      on: ["status"],
    },
  ])
