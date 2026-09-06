/**
 * Google 收录推送。对应 Spree 的 Toonhub::GooglePushService。
 * 记录文章 URL 供 sitemap / Search Console 收录发现。
 */
export class GooglePushService {
  constructor(private readonly frontendUrl?: string) {}

  articleUrl(locale: string, slug: string): string {
    const base = (this.frontendUrl || process.env.TOONHUB_FRONTEND_URL || "https://toonhubshop.com").replace(/\/+$/, "")
    return `${base}/us/${locale}/articles/${slug}`
  }

  sitemapUrl(): string {
    const base = (this.frontendUrl || process.env.TOONHUB_FRONTEND_URL || "https://toonhubshop.com").replace(/\/+$/, "")
    return `${base}/sitemap.xml`
  }
}
