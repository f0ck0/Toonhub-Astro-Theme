/**
 * 促销状态共享工具:前端据此决定是否展示活动文案与自动应用折扣。
 * 从后端动态读取 active 的 buyget 促销(code + 折扣率)——后台改码/改折扣率,
 * 前端自动跟随,无需改动代码。
 */
import { config } from "./config"

export interface PromoInfo {
  active: boolean
  code: string | null
  value: number | null
}

let cached: PromoInfo | null = null

/** 促销信息(缓存,最多一次请求) */
export async function promoInfo(): Promise<PromoInfo> {
  if (cached) return cached
  // 测试环境不发网络请求,促销视为停用(测试保持确定性)
  if (import.meta.env?.MODE === "test") {
    cached = { active: false, code: null, value: null }
    return cached
  }
  try {
    const { baseUrl, publishableKey } = config()
    const res = await fetch(`${baseUrl}/store/promotion-status`, {
      headers: { "x-publishable-api-key": publishableKey },
      signal: AbortSignal.timeout(5000),
    })
    const data = (await res.json().catch(() => ({}))) as Partial<PromoInfo>
    // value 可能是数字或数字字符串(pg/不同实现),统一转 number
    cached = {
      active: Boolean(data.active),
      code: data.code || null,
      value: data.value != null ? Number(data.value) : null,
    }
  } catch {
    cached = { active: false, code: null, value: null }
  }
  return cached
}

/** 促销是否 active */
export async function promoActive(): Promise<boolean> {
  return (await promoInfo()).active
}

/** 动态活动文案:Buy 1 get 2nd {value}% off(未启用返回空串) */
export async function promoLabel(): Promise<string> {
  const info = await promoInfo()
  if (!info.active || info.value == null) return ""
  return `Buy 1 get 2nd ${info.value}% off`
}
