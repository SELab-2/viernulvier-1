import z from "zod";
import { createSchema } from "./index.js";
import { languageMap, primaryKey } from "./helpers.js";

export const HallSchema = createSchema({
  id: primaryKey(),
  address: z.string(),
  vendor_id: z.int().nonnegative(),
  name: languageMap,

  // unnecessary
  // box_office_id: z.number().nullable(),
  // seat_selection: z.boolean().nullable(),
  // open_seating: z.boolean().nullable(),
  // remark: z.json().nullable(),
  // space: z.json().nullable(),
});

export type Hall = z.infer<typeof HallSchema>;
export type HallWithMeta = z.infer<ReturnType<typeof HallSchema.withMeta>>;
