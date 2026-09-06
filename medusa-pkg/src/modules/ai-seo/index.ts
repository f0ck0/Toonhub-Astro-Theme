import { Module } from "@medusajs/framework/utils"
import { AiSeoModuleService } from "./services/ai-seo-module"

export const AI_SEO_MODULE = "ai_seo"

export default Module(AI_SEO_MODULE, {
  service: AiSeoModuleService,
})
