import { AiAdapter } from "./ai-adapter"
import { ContentScorer } from "./content-scorer"
import { InternalLinker } from "./internal-linker"

/**
 * 文章优化器。对应 Spree 的 Toonhub::ArticleOptimizer。
 * 低于 passScore 时:补 H2 结构/SEO 字段 → 注入内链 → 重新评分。
 */
export interface ArticleEditLike {
  id: string
  title?: string | null
  summary?: string | null
  content?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  locale?: string | null
  optimization_attempts?: number | null
}

export interface ArticleEditor {
  getArticle(id: string): Promise<ArticleEditLike | null>
  updateArticle(id: string, data: Partial<ArticleEditLike>): Promise<void>
  listRules(locale: string): Promise<Array<{ id: string; anchor_text: string; target_url: string; max_insertions?: number | null }>>
  recordRuleUsage(usage: Record<string, number>, articleId: string, locale: string): Promise<void>
}

export class ArticleOptimizer {
  static async optimizeIfNeeded(editor: ArticleEditor, articleId: string, score?: { overall_score?: number | null } | null): Promise<boolean> {
    const article = await editor.getArticle(articleId)
    if (!article) return false
    const content = (article.content || "").trim()
    if (!content) return false

    const currentScore = score?.overall_score ?? 0
    if (currentScore >= 75) return false

    const attempts = Number(article.optimization_attempts) || 0
    if (attempts >= 2) return false

    await this.optimize(editor, article, attempts)
    return true
  }

  private static async optimize(editor: ArticleEditor, article: ArticleEditLike, attempts: number): Promise<void> {
    const content = (article.content || "").toString()
    let newContent = content
    if (!/<h2|##\s+/i.test(content)) {
      const summary = (article.summary || "").trim()
      const safeSummary = summary.replace(/&/g, "&amp;").replace(/</g, "&lt;")
      newContent = [
        "<h2>Why this matters for anime figure collectors</h2>",
        `<p>${safeSummary}</p>`,
        content,
        "<h2>Collector buying tips</h2>",
        "<p>When choosing anime figures, collectors should compare sculpt details, paint quality, scale, shelf space, and how closely the design matches the character. A clear collecting plan helps buyers choose figures that fit their display style and budget.</p>",
        "<h2>Display and care advice</h2>",
        "<p>Keep figures away from direct sunlight, moisture, and dusty corners. Use stable shelves, gentle cleaning tools, and enough spacing between statues to protect delicate parts.</p>",
      ].join("\n")
    }

    const locale = article.locale || "en"
    const rules = await editor.listRules(locale)
    const linkResult = InternalLinker.apply(newContent, rules, 8)
    newContent = linkResult.content

    const updateData: Partial<ArticleEditLike> = {
      content: newContent,
      seo_title: article.seo_title || String(article.title || "").slice(0, 68),
      seo_description: article.seo_description || (article.summary || "").slice(0, 155),
      seo_keywords: article.seo_keywords || "anime figures, anime statues, collectible figures, Toonhub",
      optimization_attempts: attempts + 1,
    }
    await editor.updateArticle(article.id, updateData)
    if (linkResult.inserted_count > 0) {
      await editor.recordRuleUsage(linkResult.rule_usage, article.id, locale)
    }

    const after = ContentScorer.scoreArticle({ ...article, ...updateData, source_product_name: null })
    void after // caller re-scores explicitly if needed
  }
}
