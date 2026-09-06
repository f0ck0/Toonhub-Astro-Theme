// 重建后重新注入默认简体中文脚本到 admin index.html
// 原因:medusa build 会重新生成 .medusa/server/public/admin/index.html,抹掉手动注入。
// 用法:node scripts/patch-admin-index.mjs [backendDir]
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const dir = process.argv[2] || process.cwd()
const htmlPath = join(dir, ".medusa/server/public/admin/index.html")

if (!existsSync(htmlPath)) {
  console.error(`index.html not found: ${htmlPath}`)
  process.exit(1)
}

const html = readFileSync(htmlPath, "utf8")
const INJECT = `<script>
        // 默认简体中文:dashboard 通过 \`lng\` cookie 初始化 i18n。
        // 用户未显式选择过语言时,默认下发 zhCN,使管理后台默认即为中文界面。
        if (!document.cookie.match(/(?:^|;\\s*)lng=/)) {
          document.cookie = "lng=zhCN; path=/; max-age=31536000; SameSite=Lax";
        }
      </script>`

if (html.includes("lng=zhCN")) {
  console.log("already patched, skip")
  process.exit(0)
}

// 在第一个 <script type="module" ...> 之前插入
const marker = '<script type="module"'
const idx = html.indexOf(marker)
if (idx === -1) {
  console.error("module script tag not found, cannot inject")
  process.exit(1)
}
const patched = html.slice(0, idx) + INJECT + "\n      " + html.slice(idx)
writeFileSync(htmlPath, patched)
console.log(`patched ${htmlPath}`)
