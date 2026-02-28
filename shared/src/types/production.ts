import z from "zod"
import { AdminSchema } from "./index";

export const ProductionSchema: z.ZodObject = z.object({
  // metadata
  created_by: AdminSchema,
  created_at: z.date(),
  updated_at: z.date(),

  id: z.number(),
  vendor_id: z.number(),
  supertitle: z.json().nullable(),
  title: z.json(),
  artist: z.json(),
  tagline: z.json().nullable(),
  teaser: z.json().nullable(),
  description: z.json().nullable(),
  description_extra: z.json().nullable(),
  description_2: z.json().nullable(),
  video_1: z.json().nullable(),
  video_2: z.json().nullable(),
  quote: z.json().nullable(),
  quote_source: z.json().nullable(),
  programme: z.json().nullable(),
  info: z.json().nullable(),

  // unnecessary
  // performer_field: z.string().nullable(),
  // performer_type: z.string().nullable(),
  // attendance_mode: z.string().nullable(),
  // meta_title: z.json().nullable(),
  // meta_description: z.json().nullable(),
  // description_short: z.json().nullable(),
  // eticket_info: z.json().nullable(),
  // custom_data: z.json().nullable(),
});

export type Production = z.infer<typeof ProductionSchema>;