import z from "zod";
import { HallSchema, ProductionSchema } from "./index.js";
import { ForeignKey } from "./helpers.js";
export declare const EventSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    starts_at: z.ZodDate;
    ends_at: z.ZodDate;
    doors_at: z.ZodDate;
    vendor_id: z.ZodInt;
    info: z.ZodRecord<z.ZodEnum<{
        nl: "nl";
        en: "en";
        fr: "fr";
    }> & z.z.core.$partial, z.ZodString>;
    readonly production_id: ForeignKey<typeof ProductionSchema>;
    readonly hall: ForeignKey<typeof HallSchema>;
}>;
export declare const EventSchemaWithBackwardsRef: import("./metadata.js").SchemaWithMeta<{
    readonly price: z.ZodArray<ForeignKey<typeof EventPriceSchema>>;
}>;
export type Event = z.infer<typeof EventSchema>;
export type EventWithMeta = z.infer<ReturnType<typeof EventSchema.withMeta>>;
export declare const EventPriceSchema: import("./metadata.js").SchemaWithMeta<{
    id: import("./helpers.js").PrimaryKey<z.ZodInt>;
    readonly event: ForeignKey<typeof EventSchema>;
    amount: z.ZodNumber;
}>;
export type EventPrice = z.infer<typeof EventPriceSchema>;
export type EventPriceWithMeta = z.infer<ReturnType<typeof EventPriceSchema.withMeta>>;
//# sourceMappingURL=event.d.ts.map