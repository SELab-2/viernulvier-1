import z from "zod";

import { createSchema } from "./metadata.js";
import { ForeignKey, foreignKey, languageMap, primaryKey } from "./helpers.js";
import { ProductionSchema } from "./production.js";

export const BlogSchema = createSchema({
  id: primaryKey(),
  name: languageMap,
  description: languageMap,
});

export type Blog = z.infer<typeof BlogSchema>;
export type BlogWithMeta = z.infer<ReturnType<typeof BlogSchema.withMeta>>;

export const BlogPostSchema = createSchema({
  id: primaryKey(),
  blog: foreignKey(() => BlogSchema),
  title: languageMap,
  content: languageMap,
  published_at: z.coerce.date().nullable(),
});

export const BlogPostWithBackwardsRefsSchema = createSchema({
  ...BlogPostSchema.shape,
  get productions(): z.ZodArray<ForeignKey<typeof ProductionSchema>> {
    return z.array(foreignKey(() => ProductionSchema));
  },
});

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type BlogPostWithBackwardsRefs = z.infer<typeof BlogPostWithBackwardsRefsSchema>;
export type BlogPostWithMeta = z.infer<ReturnType<typeof BlogPostWithBackwardsRefsSchema.withMeta>>;