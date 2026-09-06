import { defineRouteConfig } from "@medusajs/admin-sdk"
import { GlobeEurope } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Select, Badge } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type LocalizationItem = {
  status: string
  product_id: string
  locale: string
  translation?: {
    title: string
    description: string
    meta_title?: string | null
  }
  error?: string
}

const Api = {
  get: async (path: string) => (await fetch(path)).json(),
  post: async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json()
  },
}

const LOCALES = ["de", "fr", "es", "it", "pl", "ja", "zh-TW", "zh-CN"]

const LocalizationPage = () => {
  const queryClient = useQueryClient()
  const [locale, setLocale] = useState("de")
  const [limit, setLimit] = useState("5")
  const [items, setItems] = useState<LocalizationItem[]>([])

  const preview = useMutation({
    mutationFn: async () => {
      const data = await Api.post("/admin/ai-seo/localization/preview", {
        locales: [locale],
        limit: Number(limit),
        force: false,
      })
      setItems(data.items || [])
      return data
    },
  })

  const apply = useMutation({
    mutationFn: async () => {
      const readyItems = items.filter((i) => i.status === "preview_ready").map((i) => i.translation).filter(Boolean)
      return Api.post("/admin/ai-seo/localization/apply", { items: readyItems })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-seo-localization"] }),
  })

  const queue = useMutation({
    mutationFn: async () =>
      Api.post("/admin/ai-seo/localization/queue", {
        locales: [locale],
        limit: Number(limit) * 4,
        force: false,
      }),
  })

  const readyCount = items.filter((i) => i.status === "preview_ready").length

  return (
    <Container className="p-6">
      <Heading level="h1">产品本地化</Heading>
      <Text className="text-ui-fg-subtle">AI 将产品标题/描述/元数据翻译为多语言(写入 translation 模块,storefront 自动应用)</Text>

      <div className="flex gap-x-2 mt-4 items-end">
        <div>
          <Text className="text-sm mb-1">目标语言</Text>
          <Select value={locale} onValueChange={setLocale}>
            <Select.Trigger />
            <Select.Content>
              {LOCALES.map((l) => (
                <Select.Item key={l} value={l}>{l}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div>
          <Text className="text-sm mb-1">预览数量</Text>
          <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-24" />
        </div>
        <Button isLoading={preview.isPending} onClick={() => preview.mutate()}>生成预览</Button>
        <Button
          variant="secondary"
          disabled={!readyCount}
          isLoading={apply.isPending}
          onClick={() => apply.mutate()}
        >
          应用预览 ({readyCount})
        </Button>
        <Button variant="secondary" isLoading={queue.isPending} onClick={() => queue.mutate()}>
          排队串行翻译
        </Button>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 mt-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div key={`${item.product_id}-${item.locale}-${index}`} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Text className="font-medium text-sm">{item.product_id}</Text>
                <Badge
                  color={
                    item.status === "preview_ready" ? "green" : item.status === "preview_failed" ? "red" : "grey"
                  }
                >
                  {item.status}
                </Badge>
              </div>
              {item.translation ? (
                <div className="mt-2">
                  <Text className="text-sm font-medium">{item.translation.title}</Text>
                  <Text className="text-xs text-ui-fg-subtle mt-1">{item.translation.description}</Text>
                  {item.translation.meta_title && (
                    <Text className="text-xs text-ui-fg-subtle mt-1">{item.translation.meta_title}</Text>
                  )}
                </div>
              ) : (
                <Text className="text-xs text-ui-fg-subtle mt-2">{item.error || "已跳过(存在完整翻译)"}</Text>
              )}
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 本地化",
  icon: GlobeEurope,
})

export default LocalizationPage
