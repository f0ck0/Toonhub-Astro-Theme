import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "zod"

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { posts }
