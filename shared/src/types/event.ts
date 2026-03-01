import z from "zod"

import { AdminSchema, HallSchema, MetadataSchema } from "./index";

export const EventSchema = MetadataSchema.extend({
    id: z.number(),
    starts_at: z.date(),
    ends_at: z.date(),
    production_id: z.number(),
    hall: HallSchema,
    doors_at: z.date(),
    box_office_id: z.number(),
    vendor_id: z.number(),
    status: z.json(),
    info: z.json(),

    // unnecessary
    // intermission_at: z.date().nullable(),
    // max_tickets_per_order: z.number().nullable(),
    // uitdatabank_id: z.number().nullable(),
    // secure: z.boolean().nullable(),
    // sms_verification: z.boolean().nullable(),
    // eticket_info: z.json().nullable(),
    // order_url: z.string().nullable(),
    // external_order_url: z.json().nullable(),
});

export type Event = z.infer<typeof EventSchema>;