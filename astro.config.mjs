import { defineConfig } from "astro/config"
import node from "@astrojs/node"
import tailwindcss from "@tailwindcss/vite"
import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://toonhubshop.com",
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 8888,
    host: true,
    allowedHosts: true,
  },
  preview: {
    port: 3001,
    host: true,
  },
})
