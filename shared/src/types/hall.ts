import z from "zod"

const HallSchema = z.object({
  // metadata
  created_by: z.number(),
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