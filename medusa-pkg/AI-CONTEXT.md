# AI 开发者上下文说明(Medusa 后端)

> 本文档专门为 AI 开发者编写:目的是让 AI 快速理解本仓库架构,以便开发新插件/功能模块,与前端更好地配合。

## 项目概况

- **技术栈**:Medusa v2.19(Node.js 22 / TypeScript / PostgreSQL / Redis)
- **业务**:Toonhub 动漫手办商城后端;管理后台为 Medusa Admin(React + Radix UI + TanStack Query)
- **包结构**:monorepo 的应用目录为 `apps/backend`(本包即该目录内容)
- **数据库**:PostgreSQL 18,库名 `medusa_toonhub`(1452 个商品);**本包不含真实 .env 值**(已脱敏),键名见 `.env`,运行需自行配置
- **已启用扩展**:官方 Translation 模块(`featureFlags.translation` + `@medusajs/medusa/translation`)、`@lambdacurry/medusa-product-reviews`(评论,审核制)、Stripe/PayPal 支付、自研 AI SEO 内嵌模块

## 目录结构(按插件开发顺序)

```
medusa-config.ts          # 模块注册、featureFlags、http/cookie 配置
src/
  modules/ai-seo/         # ★ 最佳插件范式:完整的自研模块
    index.ts              #   Module() 定义(注入依赖、导出 service)
    models/*.ts           #   DML 数据模型(14 张表)
    services/             #   MedusaService 子类 + 业务服务(ai-adapter/评分/内链/本地化…)
    migrations/           #   迁移脚本(通过 medusa db:migrate 应用)
  api/
    admin/ai-seo/**       # Admin API 路由(每目录 route.ts,GET/POST/PATCH/DELETE)
    store/ai-seo/**       # Storefront 公开 API(需 x-publishable-api-key)
    middlewares.ts        # 全局中间件(/images/* 图片静态服务、/app 默认中文)
  admin/
    routes/ai-seo*/page.tsx   # Admin 前端页面(侧边栏菜单)
    i18n/                     # 扩展翻译资源
  jobs/ai-seo-task-worker.ts  # 定时任务(替代 Sidekiq,每分钟轮询任务队列)
  links/  subscribers/  workflows/  migration-scripts/
```

## ★ 新增插件/功能的范式(照抄 ai-seo 模块即可)

1. **数据模型**:`src/modules/<name>/models/*.ts` 用 DML 定义(如 `model.define("ai_article", {...})`),
   时间字段用 `model.dateTime()`(不是 `model.datetime()`);新增迁移脚本放 `migrations/`。
2. **模块服务**:`services/<name>-module.ts` 继承 `MedusaService({ ModelA, ModelB })`(基类是 `MedusaService`,
   不是 `ModuleService`);生成的 CRUD 方法为复数命名:
   `listAndCountXxx` / `createXxx` / `retrieveXxx` / `updateXxx`(单对象 `{ id, ...data }`) / `deleteXxx`。
3. **注册模块**:`medusa-config.ts` 的 `modules` 数组里加 `{ resolve: "./src/modules/<name>" }`,
   路由里用 `req.scope.resolve(MODULE_KEY)` 取服务。
4. **API 路由**:`src/api/admin/<name>/route.ts`(可嵌套 `[id]/` 子路由);返回 `res.json(...)` 即可,
   admin 路由自带认证(401),store 路由需 publishable key。
5. **Admin 页面**:`src/admin/routes/<name>/page.tsx`,默认导出组件 + `export const config = defineRouteConfig({ label, icon })`。
6. **异步任务**:`src/jobs/<name>.ts` 导出 `default async function(container)` + `export const config = { name, schedule: "*/1 * * * *" }`。

## 已知坑(开发时必须遵守)

- **Admin 路由文件必须命名为 `page.tsx`**(`index.tsx` 会导致 `medusa build` 的 lint 报错,构建失败)。
- **`@medusajs/ui` 的 `Select.Item` 的 `value` 不能是空字符串** `value=""` —— Radix Select 渲染时直接抛错,
  整个页面会显示 "An unexpected error occurred while rendering this page"。需要"全部"选项时用哨兵值如 `"all"`。
- Admin 路由 `config.icon` 传 `@medusajs/icons` 的组件(如 `DocumentText`),不是字符串。
- `@medusajs/ui` 没有 `Card` 组件;`Select.Trigger` 没有 `placeholder` 属性。
- 本服务通过 **HTTP(非 HTTPS)** 访问(:9000),`medusa-config.ts` 中 `cookieOptions: { secure: false, sameSite: "lax" }` 不可改为 secure:true。
- **`medusa build` 会重新生成 `.medusa/server/public/admin/index.html`**,抹掉默认中文注入脚本;
  每次构建后必须运行 `node scripts/patch-admin-index.mjs .` 再重启,否则后台默认变回英文。
- 时间字段序列化注意 DML 的 `json` 字段在服务层需断言为 `Record<string, unknown>`。
- Store 路由返回需兼容 publishable key 校验;AI SEO store 路由已在 `src/api/store/ai-seo/`。

## AI SEO 模块功能清单(供参考,勿重复造轮子)

提供商管理(OpenAI 兼容,Key 加密存储)、关键词收集、AI 文章生成/评分/优化(及格线 75 分)、
内部链接引擎(保护 HTML 标签,每篇 ≤8 条)、产品本地化(7 语言,写入官方 Translation 模块)、
任务队列 Worker(每分钟轮询,18 种任务类型)、自动化流水线(种子→关键词→文章)、成本/审计日志、Google 推送。

## 构建 / 开发命令

```bash
npm install            # 还原 node_modules(本包已排除)
medusa develop         # 本地开发(注意端口/数据库配置,勿指向生产)
medusa build           # 构建后端+前端 → .medusa/server
node scripts/patch-admin-index.mjs .   # 构建后必跑:恢复默认中文
medusa start           # 生产启动
medusa db:migrate      # 应用迁移
```
