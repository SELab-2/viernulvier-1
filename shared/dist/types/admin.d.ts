import z from "zod";
export declare const AdminBase: {
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    username: z.ZodString;
    profile_picture: z.ZodNullable<z.ZodURL>;
};
export declare const AdminSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    username: z.ZodString;
    profile_picture: z.ZodNullable<z.ZodURL>;
}>;
export type Admin = z.infer<typeof AdminSchema>;
export type AdminWithMeta = z.infer<ReturnType<typeof AdminSchema.withMeta>>;
//# sourceMappingURL=admin.d.ts.map