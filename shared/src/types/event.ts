import z from "zod"

import { AdminSchema, HallSchema } from "./index";

export const EventSchema = z.object({
    // metadata
    created_by: AdminSchema,
    created_at: z.date(),
    updated_at: z.date(),

    id: z.number(),
    starts_at: z.date(),
    ends_at: z.date(),
    name: z.json(),
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