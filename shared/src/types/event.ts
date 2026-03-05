import z from "zod"

import { createSchema, HallSchema, ProductionSchema } from "./index.js";
import { foreignKey, languageMap, primaryKey } from "./helpers.js";

export const EventSchema = createSchema({
    id: primaryKey,
    starts_at: z.date(),
    ends_at: z.date(),
    production_id: foreignKey(() => ProductionSchema),
    hall: foreignKey(() => HallSchema),
    doors_at: z.date(),
    vendor_id: z.int().nonnegative(),
    info: languageMap,

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