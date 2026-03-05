import z from "zod"

import { createSchema } from "./index";
import { foreignKey, primaryKey } from "./helpers";

export const BlogSchema = createSchema({
    id: primaryKey(),
    name: z.string(),
});

export type Blog = z.infer<typeof BlogSchema>;

export const BlogPostSchema = createSchema({
    id: primaryKey(),
    content: z.string(),
    blog: foreignKey(() => BlogSchema),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;