/** 前端共享 TTL 缓存(内存,进程内)。用于 Medusa 数据与 API 代理响应。
 *  条目保存写入时间,由调用方按各自 TTL 判定过期(支持每键不同 TTL,并允许熔断时兜底过期数据)。
 */

export class TtlCache {
  private store = new Map<string, { t: number; data: unknown }>()

  /** 返回 { data, age(毫秒) };无条目时返回 undefined */
  get(key: string): { data: unknown; age: number } | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    return { data: hit.data, age: Date.now() - hit.t }
  }

  set(key: string, data: unknown): void {
    this.store.set(key, { t: Date.now(), data })
  }

  clear(): void {
    this.store.clear()
  }

  size(): number {
    return this.store.size
  }
}

/** 商品/分类等 SDK 数据缓存(列表 60s,详情 300s,由调用方传 TTL) */
export const sdkCache = new TtlCache()
/** medusaFetch 代理响应缓存(列表 60s,详情 300s) */
export const httpCache = new TtlCache()

/** 全量失效(由 /api/cache-purge 调用) */
export function clearAllCaches(): number {
  const n = sdkCache.size() + httpCache.size()
  sdkCache.clear()
  httpCache.clear()
  return n
}
