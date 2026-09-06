import { AiAdapter } from "./ai-adapter"

/**
 * 产品本地化(多语言翻译)。对应 Spree 的 Toonhub::ProductLocalizer。
 * Medusa 产品的可翻译字段: title / subtitle / description / material。
 * 目标 locale 参考: de fr es it pl ja zh-TW(与 Spree 版本一致)。
 */
export interface ProductSource {
  product_id: string
  title: string
  description: string
  material?: string | null
  subtitle?: string | null
}

export interface LocalizationPayload {
  product_id: string
  locale: string
  title: string
  description: string
  subtitle?: string | null
  material?: string | null
  meta_title?: string | null
  meta_description?: string | null
  meta_keywords?: string | null
}

export interface LocalizationResult {
  status: "preview_ready" | "preview_failed" | "skipped_existing_translation"
  product_id: string
  locale: string
  translation?: LocalizationPayload
  error?: string
}

export const DEFAULT_LOCALES = ["de", "fr", "es", "it", "pl", "ja", "zh-TW"]

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pl: "Polish",
  ja: "Japanese",
  "zh-TW": "Traditional Chinese",
  "zh-CN": "Simplified Chinese",
}

const SYSTEM_PROMPT =
  "You are Toonhub's ecommerce localization and SEO editor for anime figures, statues, collectibles and model kits. Translate accurately for collectors. Preserve official anime titles, character names, brand names, model names, dimensions, materials, scale, SKU-like strings and specifications. Never invent specs, prices, availability, licensing, release dates or guarantees. Return valid JSON only. All fields must be non-empty and useful."

export class ProductLocalizer {
  constructor(
    private readonly adapter: AiAdapter,
    private readonly model?: string | null,
    private readonly force = false,
    private readonly sourceLocale = "en"
  ) {}

  async localizeProduct(product: ProductSource, locale: string): Promise<LocalizationResult> {
    const prompt = this.buildPrompt(product, locale)
    try {
      const content = await this.adapter.chat({
        prompt,
        system: SYSTEM_PROMPT,
        model: this.model || undefined,
        temperature: 0.25,
        maxTokens: 2200,
      })
      const parsed = this.parseJson(content)
      const translation = this.normalize(parsed, product, locale)
      return { status: "preview_ready", product_id: product.product_id, locale, translation }
    } catch (error) {
      return {
        status: "preview_failed",
        product_id: product.product_id,
        locale,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private buildPrompt(product: ProductSource, locale: string): string {
    const language = LANGUAGE_NAMES[locale] || locale
    return [
      `Localize this Toonhub product into ${language}.`,
      "Return ONLY valid JSON with these keys: title, description, subtitle, material, meta_title, meta_description, meta_keywords.",
      `Source locale: ${this.sourceLocale}`,
      `Target locale: ${locale}`,
      `Target language: ${language}`,
      "Source product:",
      `Title: ${product.title}`,
      `Description: ${(product.description || "").slice(0, 4500)}`,
      `Material: ${product.material || ""}`,
      `Subtitle: ${product.subtitle || ""}`,
      "Rules:",
      "- Every returned field except meta_keywords must be non-empty.",
      "- Preserve official anime, character, brand and manufacturer names unless a common official localized name exists.",
      "- Preserve PVC, ABS, Resin, GK, scale, 1/6, 1/7, cm, mm, SKU and model numbers.",
      "- Do not add fake specs, stock, discounts or release dates.",
      "- Do not include markdown fences.",
    ].join("\n")
  }

  private parseJson(content: string): Record<string, unknown> {
    const text = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim()
    try {
      return JSON.parse(text)
    } catch {
      const start = text.indexOf("{")
      const end = text.lastIndexOf("}")
      if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1))
      throw new Error("AI response did not contain JSON object")
    }
  }

  private normalize(parsed: Record<string, unknown>, product: ProductSource, locale: string): LocalizationPayload {
    const clean = (v: unknown) => String(v || "").replace(/\s+/g, " ").trim()
    const title = clean(parsed.title || parsed.name)
    const description = clean(parsed.description)
    if (!title) throw new Error(`AI returned empty title for product ${product.product_id} locale ${locale}`)
    if (!description) throw new Error(`AI returned empty description for product ${product.product_id} locale ${locale}`)

    const keywords = Array.isArray(parsed.meta_keywords)
      ? parsed.meta_keywords.map(String)
      : String(parsed.meta_keywords || parsed.keywords || "").split(/[,;\n]/).map((k) => k.trim())

    return {
      product_id: product.product_id,
      locale,
      title,
      description,
      subtitle: clean(parsed.subtitle) || null,
      material: clean(parsed.material) || null,
      meta_title: clean(parsed.meta_title).slice(0, 70) || null,
      meta_description: clean(parsed.meta_description).slice(0, 170) || null,
      meta_keywords: keywords.filter(Boolean).slice(0, 12).join(", ") || null,
    }
  }
}
