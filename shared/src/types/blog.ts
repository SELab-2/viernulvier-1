import z from "zod";

import { createSchema } from "./metadata.js";
import { foreignKey, primaryKey } from "./helpers.js";

export const BlogSchema = createSchema({
  id: primaryKey(),
  name: z.string(),
});

export type Blog = z.infer<typeof BlogSchema>;
export type BlogWithMeta = z.infer<ReturnType<typeof BlogSchema.withMeta>>;

export const BlogPostSchema = createSchema({
  id: primaryKey(),
  content: z.string(),
  blog: foreignKey(() => BlogSchema),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type BlogPostWithMeta = z.infer<ReturnType<typeof BlogPostSchema.withMeta>>;