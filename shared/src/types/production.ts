import z from "zod"
import { MetadataSchema } from "./index.js";

export const ProductionSchema: z.ZodObject<any> = MetadataSchema.extend({
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

export const FieldTypeSchema = z.enum(["number", "string", "bool", "json"]);

export const CustomProductionFieldDefinitionSchema: z.ZodObject<any> = MetadataSchema.extend({
  id: z.number(),
  name: z.string(),
  field_type: FieldTypeSchema,
});

export const CustomProductionFieldSchema: z.ZodObject<any> = MetadataSchema.extend({
  field_id: z.number(),
  production_id: z.number(),
  
  value_bool: z.boolean().nullable(),
  value_number: z.number().nullable(),
  value_string: z.string().nullable(),
  value_json: z.json().nullable(),
});

export type Production = z.infer<typeof ProductionSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type CustomProductionFieldDefinition = z.infer<typeof CustomProductionFieldDefinitionSchema>;
export type CustomProductionField = z.infer<typeof CustomProductionFieldSchema>;
