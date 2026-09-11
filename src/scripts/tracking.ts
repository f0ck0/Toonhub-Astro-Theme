/**
 * 商品浏览埋点(行为分析):
 * 浏览了哪个商品 / 停留多久 / 从哪里进入网站。匿名追踪,无个人信息。
 * 页面加载时上报浏览事件,离开(sendBeacon)时回填停留秒数。
 */
const SESSION_KEY = "toonhub_session_id"

function sessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  }
}

const startedAt = Date.now()

function productInfo(): { id: string; title: string; handle: string } | null {
  const root = document.querySelector<HTMLElement>("[data-pdp-product]")
  if (!root) return null
  const id = root.getAttribute("data-pdp-product") || ""
  if (!id) return null
  return {
    id,
    title: document.title.slice(0, 255),
    handle: location.pathname.replace(/^\/products\//, "").replace(/\/$/, "") || "",
  }
}

function reportView(): void {
  const p = productInfo()
  if (!p) return
  const payload = {
    session_id: sessionId(),
    product_id: p.id,
    title: p.title,
    handle: p.handle,
    referrer: document.referrer.slice(0, 500),
    landing_path: location.pathname.slice(0, 500),
    user_agent: navigator.userAgent.slice(0, 500),
  }
  try {
    void fetch("/api/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: AbortSignal.timeout(8000),
    }).catch(() => {})
  } catch {
    /* 埋点失败不影响浏览 */
  }
}

function reportDuration(): void {
  const p = productInfo()
  if (!p) return
  const duration = Math.round((Date.now() - startedAt) / 1000)
  if (duration <= 0) return
  const payload = JSON.stringify({
    session_id: sessionId(),
    product_id: p.id,
    duration_seconds: duration,
    update_duration: true,
  })
  try {
    navigator.sendBeacon(
      "/api/behavior",
      new Blob([payload], { type: "application/json" }),
    )
  } catch {
    /* 离开上报失败不影响浏览 */
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => reportView(), { once: true })
} else {
  reportView()
}
document.addEventListener("pagehide", () => reportDuration())
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") reportDuration()
})
