import { AiAdapter } from "./ai-adapter"

/**
 * AI 关键词收集。对应 Spree 的 Toonhub::KeywordCollector。
 */
export interface CollectedKeyword {
  keyword: string
  keyword_type: string
  priority: number
  source: string
  locale: string
}

const SYSTEM_PROMPT =
  "You are Toonhub's ecommerce SEO editor for anime figures, statues, collectibles and model kits. Write original, useful, search-friendly content. Never invent fake specs. Keep product names accurate."

export class KeywordCollector {
  constructor(
    private readonly adapter: AiAdapter,
    private readonly defaultModel?: string | null
  ) {}

  async collect(seed: string, locale = "en", count = 50, source = "manual"): Promise<CollectedKeyword[]> {
    const prompt = [
      "Generate SEO keywords for Toonhub anime figure ecommerce content.",
      `Seed topic: ${seed}`,
      `Locale/language: ${locale}`,
      "Return ONLY valid JSON array. Each item must have: keyword, keyword_type, priority.",
      "keyword_type must be one of: primary, long_tail, question, related, product, category.",
      "Include buyer-intent terms and long-tail questions. Return about " + count + " items.",
    ].join("\n")

    const raw = await this.adapter.chat({
      prompt,
      system: SYSTEM_PROMPT,
      model: this.defaultModel || undefined,
      temperature: 0.6,
    })

    const items = this.parseItems(raw)
    return items
      .map((item) => {
        const keyword = String(item.keyword || "").trim()
        if (!keyword) return null
        return {
          keyword,
          keyword_type: String(item.keyword_type || "long_tail"),
          priority: Number(item.priority) || 0,
          source,
          locale,
        }
      })
      .filter(Boolean) as CollectedKeyword[]
  }

  private parseItems(raw: string): Array<Record<string, unknown>> {
    const text = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "")
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === "string" ? { keyword: item } : item))
      }
      return []
    } catch {
      return []
    }
  }
}
