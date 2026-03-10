import z from "zod";
import { EventSchema, TagSchema } from "./index.js";
import { ForeignKey } from "./helpers.js";
export declare const ProductionSchema: import("./metadata.js").SchemaWithMeta<{
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
}>;
export declare const ProductionSchemaWithBackwardsRefs: import("./metadata.js").SchemaWithMeta<{
    tags: z.ZodArray<ForeignKey<typeof TagSchema>>;
    events: z.ZodArray<ForeignKey<typeof EventSchema>>;
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
}>;
export declare const FieldTypeSchema: z.ZodEnum<{
    string: "string";
    number: "number";
    bool: "bool";
    json: "json";
}>;
export declare const CustomProductionFieldDefinitionSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    name: z.ZodString;
    type: z.ZodEnum<{
        string: "string";
        number: "number";
        bool: "bool";
        json: "json";
    }>;
}>;
export declare const CustomProductionFieldSchema: import("./metadata.js").SchemaWithMeta<{
    readonly field_definition_id: ForeignKey<typeof CustomProductionFieldDefinitionSchema>;
    readonly production_id: ForeignKey<typeof ProductionSchema>;
    type: z.ZodEnum<{
        string: "string";
        number: "number";
        bool: "bool";
        json: "json";
    }>;
    value_bool: z.ZodNullable<z.ZodBoolean>;
    value_number: z.ZodNullable<z.ZodNumber>;
    value_string: z.ZodNullable<z.ZodString>;
    value_json: z.ZodNullable<z.ZodJSONSchema>;
}>;
export type Production = z.infer<typeof ProductionSchema>;
export type ProductionWithMeta = z.infer<ReturnType<typeof ProductionSchema.withMeta>>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type CustomProductionFieldDefinition = z.infer<typeof CustomProductionFieldDefinitionSchema>;
export type CustomProductionFieldDefinitionWithMeta = z.infer<ReturnType<typeof CustomProductionFieldDefinitionSchema.withMeta>>;
export type CustomProductionField = z.infer<typeof CustomProductionFieldSchema>;
export type CustomProductionFieldWithMeta = z.infer<ReturnType<typeof CustomProductionFieldSchema.withMeta>>;
//# sourceMappingURL=production.d.ts.map