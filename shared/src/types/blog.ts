import z from "zod";

import { createSchema } from "./metadata.js";
import { foreignKey, primaryKey } from "./helpers.js";

export const BlogSchema = createSchema({
  id: primaryKey(),
  name: z.string(),
  description: z.string().nullable(),
});

export type Blog = z.infer<typeof BlogSchema>;
export type BlogWithMeta = z.infer<ReturnType<typeof BlogSchema.withMeta>>;

export const BlogPostSchema = createSchema({
  id: primaryKey(),
  blog: foreignKey(() => BlogSchema),
  title: z.string().max(255),
  content: z.record(z.string(), z.unknown()),
  published_at: z.coerce.date().nullable(),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type BlogPostWithMeta = z.infer<ReturnType<typeof BlogPostSchema.withMeta>>;