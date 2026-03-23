import z from "zod";

import { createSchema } from "./metadata.js";
import { HallSchema } from "./hall.js";
import { ProductionSchema } from "./production.js";
import { foreignKey, languageMap, primaryKey, ForeignKey, serial } from "./helpers.js";

export const EventSchemaWithoutPrice = createSchema({
  id: primaryKey(),
  starts_at: z.date(),
  ends_at: z.date(),
  doors_at: z.date(),
  vendor_id: z.int().nonnegative(),
  info: languageMap,
  old_id: serial().nullable(),
  get production(): ForeignKey<typeof ProductionSchema> {
    return foreignKey(() => ProductionSchema);
  },
  get hall(): ForeignKey<typeof HallSchema> {
    return foreignKey(() => HallSchema);
  },

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

export const EventSchema = createSchema({
  ...EventSchemaWithoutPrice.shape,
  get price(): z.ZodArray<ForeignKey<typeof EventPriceSchema>> {
    return z.array(foreignKey(() => EventPriceSchema));
  },
});

export type Event = z.infer<typeof EventSchema>;
export type EventWithoutPrice = z.infer<typeof EventSchemaWithoutPrice>;
export type EventWithMeta = z.infer<ReturnType<typeof EventSchema.withMeta>>;

export const EventPriceSchema = createSchema({
  id: primaryKey(),
  get event(): ForeignKey<typeof EventSchemaWithoutPrice> {
    return foreignKey(() => EventSchemaWithoutPrice);
  },
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
export type EventPriceWithMeta = z.infer<
  ReturnType<typeof EventPriceSchema.withMeta>
>;
