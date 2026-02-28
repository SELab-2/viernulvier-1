import z from "zod"

import { AdminSchema } from "./index";

export const HallSchema = z.object({
  // metadata
  created_by: AdminSchema,
  created_at: z.date(),
  updated_at: z.date(),

  id: z.number(),
  address: z.string(),
  vendor_id: z.number(),
  name: z.json(),

  // unnecessary
  // box_office_id: z.number(),
  // seat_selection: z.boolean(),
  // open_seating: z.boolean(),
  // remark: z.json(),
  // space: z.json(),
});

export type Hall = z.infer<typeof HallSchema>;