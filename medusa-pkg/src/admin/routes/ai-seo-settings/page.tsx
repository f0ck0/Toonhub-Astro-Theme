import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Key } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Select, Switch, Badge, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type Provider = {
  id: string
  name: string
  provider_type: string
  base_url: string | null
  default_model: string | null
  enabled: boolean
  api_key_masked: string
  last_test_status: string | null
  last_test_message: string | null
  models_cache: string[] | null
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

const ProviderForm = ({ onDone }: { onDone: () => void }) => {
  const [name, setName] = useState("")
  const [providerType, setProviderType] = useState("openai")
  const [baseUrl, setBaseUrl] = useState("")
  const [defaultModel, setDefaultModel] = useState("gpt-4o-mini")
  const [apiKey, setApiKey] = useState("")

  const create = useMutation({
    mutationFn: async () =>
      Api.post("/admin/ai-seo/providers", {
        name,
        provider_type: providerType,
        base_url: baseUrl || undefined,
        default_model: defaultModel || undefined,
        api_key: apiKey || undefined,
        enabled: true,
      }),
    onSuccess: onDone,
  })

  return (
    <div className="flex flex-col gap-y-3 p-4 border rounded-lg">
      <Heading level="h3">新增 AI 提供商</Heading>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        <Input placeholder="名称,如 DeepSeek" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={providerType} onValueChange={setProviderType}>
          <Select.Trigger />
          <Select.Content>
            {["openai", "deepseek", "openrouter", "azure_openai", "openai_compatible"].map((t) => (
              <Select.Item key={t} value={t}>{t}</Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Input placeholder="Base URL(可选,默认按类型)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        <Input placeholder="默认模型" value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} />
        <Input placeholder="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="col-span-2" />
      </div>
      <Button isLoading={create.isPending} onClick={() => create.mutate()}>保存提供商</Button>
    </div>
  )
}

const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-providers"],
    queryFn: () => Api.get("/admin/ai-seo/providers"),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ai-seo-providers"] })

  const test = useMutation({
    mutationFn: async (id: string) => Api.post(`/admin/ai-seo/providers/${id}/test`),
    onSuccess: invalidate,
  })
  const fetchModels = useMutation({
    mutationFn: async (id: string) => Api.post(`/admin/ai-seo/providers/${id}/models`),
    onSuccess: invalidate,
  })
  const toggle = useMutation({
    mutationFn: async (p: Provider) => {
      const res = await fetch(`/admin/ai-seo/providers/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !p.enabled }),
      })
      return res.json()
    },
    onSuccess: invalidate,
  })

  const providers: Provider[] = data?.providers || []

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">AI 设置</Heading>
          <Text className="text-ui-fg-subtle">提供商、API Key、模型与连接测试</Text>
        </div>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "收起" : "新增提供商"}
        </Button>
      </div>

      {showForm && (
        <div className="mt-4">
          <ProviderForm onDone={() => { invalidate(); setShowForm(false) }} />
        </div>
      )}

      {isLoading ? (
        <Text className="mt-4">加载中...</Text>
      ) : (
        <Table className="mt-4">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>名称</Table.HeaderCell>
              <Table.HeaderCell>类型</Table.HeaderCell>
              <Table.HeaderCell>模型</Table.HeaderCell>
              <Table.HeaderCell>API Key</Table.HeaderCell>
              <Table.HeaderCell>状态</Table.HeaderCell>
              <Table.HeaderCell>操作</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {providers.map((provider) => (
              <Table.Row key={provider.id}>
                <Table.Cell>{provider.name}</Table.Cell>
                <Table.Cell>{provider.provider_type}</Table.Cell>
                <Table.Cell>{provider.default_model || "—"}</Table.Cell>
                <Table.Cell>{provider.api_key_masked || "未设置"}</Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-x-2">
                    <Switch checked={provider.enabled} onCheckedChange={() => toggle.mutate(provider)} />
                    {provider.last_test_status && (
                      <Badge color={provider.last_test_status === "ok" ? "green" : "red"}>
                        {provider.last_test_status === "ok" ? "连接正常" : "测试失败"}
                      </Badge>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-x-1">
                    <Button size="small" variant="secondary" isLoading={test.isPending && test.variables === provider.id} onClick={() => test.mutate(provider.id)}>
                      测试
                    </Button>
                    <Button size="small" variant="secondary" onClick={() => fetchModels.mutate(provider.id)}>
                      拉取模型
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {!providers.length && (
              <Table.Row>
                <Table.Cell><Text className="text-ui-fg-subtle">暂无提供商,请先添加(如 DeepSeek / OpenAI)</Text></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 设置",
  icon: Key,
})

export default SettingsPage
