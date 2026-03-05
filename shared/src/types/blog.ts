import z from "zod"

import { MetadataSchema } from "./index";

export const BlogSchema = z.object({
    ...MetadataSchema.shape,

    id: z.number().int().positive(),
    name: z.string(),
});

export type Blog = z.infer<typeof BlogSchema>;

export const BlogPostSchema = z.object({
    ...MetadataSchema.shape,

    id: z.number().int().positive(),
    content: z.string(),
    blog: BlogSchema,
});

export type BlogPost = z.infer<typeof BlogPostSchema>;