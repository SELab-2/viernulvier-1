import z from "zod";
export declare const HallSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    address: z.ZodString;
    vendor_id: z.ZodInt;
    name: z.ZodRecord<z.ZodEnum<{
        nl: "nl";
        en: "en";
        fr: "fr";
    }> & z.z.core.$partial, z.ZodString>;
}>;
export type Hall = z.infer<typeof HallSchema>;
export type HallWithMeta = z.infer<ReturnType<typeof HallSchema.withMeta>>;
//# sourceMappingURL=hall.d.ts.map