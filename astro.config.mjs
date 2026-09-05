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
    allowedHosts: ["toonhubshop.com", "www.toonhubshop.com", "96.47.238.191"],
  },
  preview: {
    port: 3001,
    host: true,
  },
})
