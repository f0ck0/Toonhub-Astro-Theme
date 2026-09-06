/**
 * 内容六维评分器。对应 Spree 的 Toonhub::ContentScorer。
 * 返回整体分与各维度分,status: passed(>=80 且 AI 风险<=45) | needs_review(>=60) | weak
 */
export interface ArticleLike {
  title?: string | null
  summary?: string | null
  content?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  source_product_name?: string | null
}

export interface ContentScoreResult {
  seo_score: number
  readability_score: number
  keyword_score: number
  originality_score: number
  product_relevance_score: number
  ai_risk_score: number
  overall_score: number
  status: "passed" | "needs_review" | "weak"
  notes: string
  checks: Record<string, unknown>
}

const PRODUCT_SIGNALS = [
  "figure", "figures", "statue", "collectible", "collector", "anime", "manga",
  "one piece", "naruto", "dragon ball", "pvc", "resin", "toonhub",
]

const AI_RISK_PHRASES = [
  "in today's fast-paced world", "it is important to note", "delve into",
  "unlock the secrets", "in conclusion", "as an ai", "moreover",
]

export class ContentScorer {
  static scoreArticle(article: ArticleLike): ContentScoreResult {
    const title = (article.title || "").toString()
    const summary = (article.summary || "").toString()
    const content = (article.content || "").toString()
    const seoTitle = (article.seo_title || "").toString()
    const seoDescription = (article.seo_description || "").toString()
    const seoKeywords = (article.seo_keywords || "").toString()
    const productName = (article.source_product_name || "").toString()

    const plainText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    const words = plainText.split(/\s+/).filter(Boolean).length
    const keywords = seoKeywords.split(/[,;\n]/).map((k) => k.trim()).filter(Boolean)
    const internalLinks = (content.match(/<a\s/gi) || []).length

    // SEO 分
    let seo = 0
    seo += title.length >= 30 && title.length <= 80 ? 15 : 0
    seo += seoTitle.length >= 30 && seoTitle.length <= 80 ? 15 : 0
    seo += seoDescription.length >= 80 && seoDescription.length <= 180 ? 15 : 0
    seo += keywords.length ? 15 : 0
    seo += internalLinks > 0 ? 15 : 0
    seo += words >= 450 ? 15 : 0
    seo += summary.length >= 60 && summary.length <= 280 ? 10 : 0

    // 可读性分
    const paragraphs = content.split(/\n{2,}|<\/p>/i).map((p) => p.trim()).filter(Boolean).length
    const sentences = plainText.split(/[.!?。！？]+/).map((s) => s.trim()).filter(Boolean).length
    let readable = 45
    readable += words >= 450 ? 15 : 0
    readable += paragraphs >= 3 ? 10 : 0
    readable += sentences >= 6 ? 10 : 0
    readable += this.avgSentenceWords(plainText) >= 8 && this.avgSentenceWords(plainText) <= 30 ? 10 : 0
    readable += /<h2|##\s+/i.test(content) ? 10 : 0

    // 关键词分
    const lowerText = plainText.toLowerCase()
    const hits = keywords.filter((k) => lowerText.includes(k.toLowerCase())).length
    let kwScore = keywords.length ? 45 + Math.min(hits * 12, 40) : 45
    kwScore += hits >= 2 ? 15 : 0

    // 原创分
    const wordList = plainText.toLowerCase().match(/\b[a-z0-9][a-z0-9\-]{3,}\b/g) || []
    const tally = new Map<string, number>()
    for (const w of wordList) tally.set(w, (tally.get(w) || 0) + 1)
    const repeated = [...tally.values()].filter((count) => count >= 12).length
    let original = 85 - Math.min(repeated * 4, 35)

    // 产品相关分
    const relevanceHits = PRODUCT_SIGNALS.filter((signal) => lowerText.includes(signal)).length
    let productRelevance = 35 + Math.min(relevanceHits * 6, 65)
    if (productName && lowerText.includes(productName.toLowerCase().split(/\s+/)[0])) productRelevance = 88

    // AI 风险分
    let aiRisk = 20
    AI_RISK_PHRASES.forEach((phrase) => {
      if (lowerText.includes(phrase)) aiRisk += 10
    })
    aiRisk += words < 350 ? 15 : 0
    aiRisk += internalLinks === 0 ? 15 : 0

    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
    seo = clamp(seo)
    readable = clamp(readable)
    kwScore = clamp(kwScore)
    original = clamp(original)
    productRelevance = clamp(productRelevance)
    aiRisk = clamp(aiRisk)

    const overall = clamp((seo + readable + kwScore + original + productRelevance) / 5)
    const status: ContentScoreResult["status"] =
      overall >= 80 && aiRisk <= 45 ? "passed" : overall >= 60 ? "needs_review" : "weak"

    return {
      seo_score: seo,
      readability_score: readable,
      keyword_score: kwScore,
      originality_score: original,
      product_relevance_score: productRelevance,
      ai_risk_score: aiRisk,
      overall_score: overall,
      status,
      notes: `Overall ${overall}. SEO ${seo}. Readability ${readable}. Keyword ${kwScore}. Product relevance ${productRelevance}. AI risk ${aiRisk}.`,
      checks: {
        words,
        keyword_hits: hits,
        internal_links: internalLinks,
        paragraphs,
        sentences,
        has_seo_title: Boolean(seoTitle),
        has_seo_description: Boolean(seoDescription),
      },
    }
  }

  private static avgSentenceWords(plainText: string): number {
    const sentences = plainText.split(/[.!?。！？]+/).map((s) => s.trim()).filter(Boolean)
    if (!sentences.length) return 0
    return sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
  }
}
