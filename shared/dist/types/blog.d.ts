import z from "zod";
export declare const BlogSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    name: z.ZodString;
}>;
export type Blog = z.infer<typeof BlogSchema>;
export type BlogWithMeta = z.infer<ReturnType<typeof BlogSchema.withMeta>>;
export declare const BlogPostSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    content: z.ZodString;
    blog: import("./helpers.js").ForeignKey<import("./metadata.js").SchemaWithMeta<{
        id: import("./helpers.js").PrimaryKey<z.ZodInt>;
        name: z.ZodString;
    }>, z.ZodInt>;
}>;
export type BlogPost = z.infer<typeof BlogPostSchema>;
export type BlogPostWithMeta = z.infer<ReturnType<typeof BlogPostSchema.withMeta>>;
//# sourceMappingURL=blog.d.ts.map