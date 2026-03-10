import z from "zod";
import { createSchema } from "./metadata.js";
import { foreignKey, primaryKey } from "./helpers.js";
export const BlogSchema = createSchema({
    id: primaryKey(),
    name: z.string(),
});
export const BlogPostSchema = createSchema({
    id: primaryKey(),
    content: z.string(),
    blog: foreignKey(() => BlogSchema),
});
//# sourceMappingURL=blog.js.map