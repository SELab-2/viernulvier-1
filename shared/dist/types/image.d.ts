import z from "zod";
export declare const ImageSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    production_id: import("./helpers.js").ForeignKey<import("./metadata.js").SchemaWithMeta<{
        id: import("./helpers.js").PrimaryKey<z.ZodInt>;
        vendor_id: z.ZodInt;
        box_office_id: z.ZodInt;
        supertitle: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        title: z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>;
        artist: z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>;
        tagline: z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>;
        teaser: z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>;
        description: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        description_extra: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        description_2: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        video_1: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        video_2: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        quote: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        quote_source: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        programme: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
        info: z.ZodNullable<z.ZodRecord<z.ZodEnum<{
            nl: "nl";
            en: "en";
            fr: "fr";
        }> & z.z.core.$partial, z.ZodString>>;
    }>, z.ZodInt>;
    res: z.ZodString;
}>;
export type Image = z.infer<typeof ImageSchema>;
export type ImageWithMeta = z.infer<ReturnType<typeof ImageSchema.withMeta>>;
//# sourceMappingURL=image.d.ts.map