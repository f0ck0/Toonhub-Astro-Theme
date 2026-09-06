import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    // Admin 面板当前通过 http://96.47.238.191:9000（无 HTTPS）访问，
    // 生产环境默认 secure cookie 会导致浏览器拒绝保存会话，登录后无法进入后台。
    cookieOptions: {
      secure: false,
      sameSite: "lax",
    },
  },

  admin: {
    disable: false,
  },

  // 多语言/翻译功能(v2.12.3+ 实验特性):
  // 1) 启用后 Admin 后台出现 Settings → Translations 管理页(可添加 zhCN locale、批量翻译实体内容);
  // 2) 个人资料 → 编辑资料 → Language 可直接切换简体中文 UI(内置 zhCN 翻译)。
  featureFlags: {
    translation: true,
  },

  plugins: [
    {
      resolve: "@lambdacurry/medusa-product-reviews",
      options: {
        // 新评论默认 pending, 后台审核通过后再展示
        defaultReviewStatus: "pending",
      },
    },
  ],

  modules: [
    {
      resolve: "@medusajs/medusa/translation",
    },
    {
      // AI SEO 模块(从 Spree 后端移植:文章/关键词/任务/评分/内链/本地化/自动化)
      resolve: "./src/modules/ai-seo",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              capture: process.env.STRIPE_AUTO_CAPTURE === "true",
            },
          },
          {
            resolve: "@alphabite/medusa-paypal/providers/paypal",
            id: "paypal",
            options: {
              clientId: process.env.PAYPAL_CLIENT_ID,
              clientSecret: process.env.PAYPAL_CLIENT_SECRET,
              isSandbox: process.env.PAYPAL_IS_SANDBOX === "true",
              webhookId: process.env.PAYPAL_WEBHOOK_ID,
            },
          },
        ],
      },
    },
  ],
})
