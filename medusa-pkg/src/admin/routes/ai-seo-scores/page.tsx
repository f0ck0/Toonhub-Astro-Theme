import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import { Container, Heading, Text, Button, Badge, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

type Score = {
  id: string
  article_id: string | null
  overall_score: number | null
  status: string | null
  seo_score: number | null
  readability_score: number | null
  keyword_score: number | null
  ai_risk_score: number | null
  updated_at: string | null
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

const STATUS_COLORS: Record<string, "green" | "orange" | "red"> = {
  passed: "green",
  needs_review: "orange",
  weak: "red",
}

const ScoresPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-scores"],
    queryFn: () => Api.get("/admin/ai-seo/scores"),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ai-seo-scores"] })

  const rescore = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/scores/rescore", { limit: 50 }),
    onSuccess: invalidate,
  })
  const optimizeLow = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/scores/optimize-low", { limit: 50 }),
    onSuccess: invalidate,
  })

  const scores: Score[] = data?.scores || []

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">内容评分</Heading>
          <Text className="text-ui-fg-subtle">六维 SEO 质量与 AI 风险评分(阈值: 75 分通过)</Text>
        </div>
        <div className="flex gap-x-2">
          <Button variant="secondary" isLoading={rescore.isPending} onClick={() => rescore.mutate()}>
            重评最近文章
          </Button>
          <Button variant="secondary" isLoading={optimizeLow.isPending} onClick={() => optimizeLow.mutate()}>
            优化低分文章
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Text className="mt-4">加载中...</Text>
      ) : (
        <Table className="mt-4">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>文章 ID</Table.HeaderCell>
              <Table.HeaderCell>总分</Table.HeaderCell>
              <Table.HeaderCell>状态</Table.HeaderCell>
              <Table.HeaderCell>SEO</Table.HeaderCell>
              <Table.HeaderCell>可读性</Table.HeaderCell>
              <Table.HeaderCell>关键词</Table.HeaderCell>
              <Table.HeaderCell>AI 风险</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {scores.map((score) => (
              <Table.Row key={score.id}>
                <Table.Cell>{score.article_id || "—"}</Table.Cell>
                <Table.Cell><Text className="font-medium">{score.overall_score ?? "—"}</Text></Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLORS[score.status || ""] || "grey"}>{score.status || "—"}</Badge>
                </Table.Cell>
                <Table.Cell>{score.seo_score ?? "—"}</Table.Cell>
                <Table.Cell>{score.readability_score ?? "—"}</Table.Cell>
                <Table.Cell>{score.keyword_score ?? "—"}</Table.Cell>
                <Table.Cell>{score.ai_risk_score ?? "—"}</Table.Cell>
              </Table.Row>
            ))}
            {!scores.length && (
              <Table.Row>
                <Table.Cell><Text className="text-ui-fg-subtle">暂无评分,先在文章中心对文章点"评分"</Text></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 评分",
  icon: ChartBar,
})

export default ScoresPage
