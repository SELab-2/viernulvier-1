import z from "zod"

import { AdminSchema, MetadataSchema } from "./index";

export const BlogSchema = MetadataSchema.extend({
    id: z.number(),
    name: z.string(),
});

export type Blog = z.infer<typeof BlogSchema>;

export const BlogPostSchema = MetadataSchema.extend({
    id: z.number(),
    content: z.string(),
    blog: BlogSchema,
});

export type BlogPost = z.infer<typeof BlogPostSchema>;