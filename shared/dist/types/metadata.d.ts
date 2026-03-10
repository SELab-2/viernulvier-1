import z from "zod";
export declare const MetadataShape: {
    created_by: import("./helpers.js").ForeignKey<SchemaWithMeta<{
        id: import("./helpers.js").PrimaryKey<z.ZodInt>;
        username: z.ZodString;
        profile_picture: z.ZodNullable<z.ZodURL>;
    }>, z.ZodInt>;
    created_at: z.z.ZodCoercedDate<unknown>;
    updated_by: import("./helpers.js").ForeignKey<SchemaWithMeta<{
        id: import("./helpers.js").PrimaryKey<z.ZodInt>;
        username: z.ZodString;
        profile_picture: z.ZodNullable<z.ZodURL>;
    }>, z.ZodInt>;
    updated_at: z.z.ZodCoercedDate<unknown>;
};
/**
 * Creates a Zod schema with an additional `withMeta` method that extends the schema with metadata fields.
 * Use this instead of `z.object({...})` when defining new schemas.
 *
 * @param shape - The Zod raw shape to create the schema from
 * @returns A Zod object schema with a non-enumerable `withMeta` method
 */
export declare function createSchema<T extends z.ZodRawShape>(shape: T): SchemaWithMeta<T>;
export type SchemaWithMeta<T extends z.ZodRawShape> = z.ZodObject<T> & {
    withMeta: () => z.ZodObject<T & typeof MetadataShape>;
};
//# sourceMappingURL=metadata.d.ts.map