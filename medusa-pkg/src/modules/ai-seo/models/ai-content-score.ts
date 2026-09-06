import { model } from "@medusajs/framework/utils"

/**
 * 内容评分。对应 Spree 的 toonhub_ai_content_scores。
 * status: passed | needs_review | weak
 */
export const AiContentScore = model
  .define("ai_content_score", {
    id: model.id({ prefix: "aics" }).primaryKey(),
    article_id: model.text().nullable(),
    seo_score: model.number().nullable(),
    readability_score: model.number().nullable(),
    keyword_score: model.number().nullable(),
    originality_score: model.number().nullable(),
    product_relevance_score: model.number().nullable(),
    ai_risk_score: model.number().nullable(),
    overall_score: model.number().nullable(),
    status: model.text().nullable(),
    notes: model.text().nullable(),
    checks: model.json().nullable(),
    recommendations: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_ai_content_score_status",
      on: ["status"],
    },
    {
      name: "IDX_ai_content_score_article",
      on: ["article_id"],
    },
  ])
