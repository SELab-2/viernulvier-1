import z from "zod"

import { MetadataSchema } from "./index.js";

export const HallSchema = z.object({
  ...MetadataSchema.shape,
  
  id: z.number(),
  address: z.string(),
  vendor_id: z.number(),
  name: z.json(),

  // unnecessary
  // box_office_id: z.number().nullable(),
  // seat_selection: z.boolean().nullable(),
  // open_seating: z.boolean().nullable(),
  // remark: z.json().nullable(),
  // space: z.json().nullable(),
});

export type Hall = z.infer<typeof HallSchema>;