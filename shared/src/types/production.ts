import z, { string } from "zod";
import { createSchema } from "./index.js";
import { foreignKey, primaryKey } from "./helpers.js";

const VALID_LANGUAGES = z.enum(["nl", "en", "fr"]);

const languageMap = z
  .partialRecord(VALID_LANGUAGES, z.string())
  .refine((map) => Object.keys(map).length >= 1);

export const ProductionSchema = createSchema({
  id: primaryKey(),
  vendor_id: z.int().nonnegative(),
  box_office_id: z.int().nonnegative(),
  supertitle: languageMap.nullable(),
  title: languageMap,
  artist: languageMap,
  tagline: languageMap,
  teaser: languageMap,
  description: languageMap.nullable(),
  description_extra: languageMap.nullable(),
  description_2: languageMap.nullable(),
  video_1: languageMap.nullable(),
  video_2: languageMap.nullable(),
  quote: languageMap.nullable(),
  quote_source: languageMap.nullable(),
  programme: languageMap.nullable(),
  info: languageMap.nullable(),

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

export const CustomProductionFieldDefinitionSchema = createSchema({
  id: primaryKey(),
  name: z.string().max(64),
  type: FieldTypeSchema,
});

export const CustomProductionFieldSchema = createSchema({
  field_definition_id: foreignKey(() => CustomProductionFieldDefinitionSchema),
  production_id: foreignKey(() => ProductionSchema),

  type: FieldTypeSchema,

  value_bool: z.boolean().nullable(),
  value_number: z.number().nullable(),
  value_string: z.string().nullable(),
  value_json: z.json({ params: {} }).nullable(),
}).refine((schema) => {
  return (
    schema[`value_${schema.type}`] != null &&
    Object.entries(schema)
      .filter(
        ([key, _]) => key.startsWith("value") && !key.endsWith(schema.type),
      )
      .reduce((acc, [_, val]) => acc && val == null, true)
  );
});

export type Production = z.infer<typeof ProductionSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type CustomProductionFieldDefinition = z.infer<
  typeof CustomProductionFieldDefinitionSchema
>;
export type CustomProductionField = z.infer<typeof CustomProductionFieldSchema>;
