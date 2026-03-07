import z from "zod";

import { createSchema } from "./metadata.js";
import { HallSchema, ProductionSchema } from "./index.js";
import type { SchemaWithMeta } from "./index.js";
import { foreignKey, languageMap, primaryKey } from "./helpers.js";

export const EventSchema = createSchema({
    id: primaryKey(),
    starts_at: z.date(),
    ends_at: z.date(),
    production_id: foreignKey(() => ProductionSchema),
    hall: foreignKey(() => HallSchema),
    doors_at: z.date(),
    vendor_id: z.int().nonnegative(),
    info: languageMap,
    price: z.array(foreignKey(() => EventPriceSchema)),

    // unnecessary
    // box_office_id: z.int().nonnegative(),
    // status: languageMap,
    // intermission_at: z.date().nullable(),
    // max_tickets_per_order: z.int().positive().nullable(),
    // uitdatabank_id: z.string().nullable(),
    // secure: z.boolean().nullable(),
    // sms_verification: z.boolean().nullable(),
    // eticket_info: languageMap.nullable(),
    // order_url: z.string().nullable(),
    // external_order_url: languageMap.nullable(),
});

export type Event = z.infer<typeof EventSchema>;
export type EventWithMeta = z.infer<ReturnType<typeof EventSchema.withMeta>>;

export const EventPriceSchema: SchemaWithMeta<any> = createSchema({
    id: primaryKey(),
    event: foreignKey((): typeof EventSchema => EventSchema),
    amount: z.number().nonnegative(),

    // unnecessary
    // box_office_id: z.int().nonnegative(),
    // available: z.int().nonnegative(),
    // contingent_id: z.int().nonnegative().nullable(),
    // expires_at: z.date().nullable(),
    // price: z.json(),
    // rank: z.json(),
});

export type EventPrice = z.infer<typeof EventPriceSchema>;
export type EventPriceWithMeta = z.infer<ReturnType<typeof EventPriceSchema.withMeta>>;