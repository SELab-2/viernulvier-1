import { ProductionSchema } from "./production.js";
import z from "zod";
import { type ForeignKey } from "./helpers.js";
export declare const TagTypeSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    name: z.ZodRecord<z.ZodEnum<{
        nl: "nl";
        en: "en";
        fr: "fr";
    }> & z.z.core.$partial, z.ZodString>;
    visible: z.ZodBoolean;
}>;
export type TagType = z.infer<typeof TagTypeSchema>;
export type TagTypeWithMeta = z.infer<ReturnType<typeof TagTypeSchema.withMeta>>;
export declare const TagSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    name: z.ZodRecord<z.ZodEnum<{
        nl: "nl";
        en: "en";
        fr: "fr";
    }> & z.z.core.$partial, z.ZodString>;
    type: ForeignKey<import("./metadata.js").SchemaWithMeta<{
        id: import("./helpers.js").PrimaryKey<z.ZodInt>;
        name: z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>;
        visible: z.ZodBoolean;
    }>, z.ZodInt>;
    readonly productions: z.ZodArray<ForeignKey<typeof ProductionSchema>>;
}>;
export type Tag = z.infer<typeof TagSchema>;
export type TagWithMeta = z.infer<ReturnType<typeof TagSchema.withMeta>>;
//# sourceMappingURL=tag.d.ts.map