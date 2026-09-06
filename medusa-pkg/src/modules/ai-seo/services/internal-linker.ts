/**
 * 内链注入引擎。对应 Spree 的 Toonhub::InternalLinker。
 * 将锚文本规则注入文章正文,保护 <a>/<h1-6>/<script>/<style> 区域,每篇最多 maxLinks 条。
 */
export interface LinkRuleLike {
  id: string
  anchor_text: string
  target_url: string
  max_insertions?: number | null
}

export interface LinkResult {
  content: string
  inserted_count: number
  rule_usage: Record<string, number>
}

const PROTECTED =
  /(<a\b[^>]*>.*?<\/a>|<h[1-6]\b[^>]*>.*?<\/h[1-6]>|<script\b[^>]*>.*?<\/script>|<style\b[^>]*>.*?<\/style>)/im

export class InternalLinker {
  static apply(content: string, rules: LinkRuleLike[], maxLinks = 8): LinkResult {
    const original = content || ""
    if (!original.trim()) return { content: original, inserted_count: 0, rule_usage: {} }
    if (!rules.length) return { content: original, inserted_count: 0, rule_usage: {} }

    let current = original
    let insertedTotal = 0
    const usedTargets = new Set<string>()
    const usedAnchors = new Set<string>()
    const usage: Record<string, number> = {}

    for (const rule of rules) {
      if (insertedTotal >= maxLinks) break
      const anchor = (rule.anchor_text || "").trim()
      const target = (rule.target_url || "").trim()
      if (!anchor || !target) continue
      if (usedTargets.has(target)) continue
      if (usedAnchors.has(anchor.toLowerCase())) continue

      const limit = Math.max(Number(rule.max_insertions) || 1, 1)
      const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const pattern = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "i")

      let inserted = 0
      let left = limit

      current = current
        .split(PROTECTED)
        .map((part) => {
          if (PROTECTED.test(part)) return part
          return part.replace(pattern, (match) => {
            if (left <= 0) return match
            left -= 1
            inserted += 1
            return `<a href="${target.replace(/"/g, "&quot;")}">${match}</a>`
          })
        })
        .join("")

      if (inserted > 0) {
        insertedTotal += inserted
        usedTargets.add(target)
        usedAnchors.add(anchor.toLowerCase())
        usage[rule.id] = (usage[rule.id] || 0) + inserted
      }
    }

    return { content: current, inserted_count: insertedTotal, rule_usage: usage }
  }
}
