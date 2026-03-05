import z from "zod";
import { EventSchema, SchemaWithMeta, createSchema } from "./index.js";
import { foreignKey, primaryKey, languageMap } from "./helpers.js";

export const ProductionSchema: SchemaWithMeta<any> = createSchema({
  id: primaryKey(),
  vendor_id: z.int().nonnegative(),
  box_office_id: z.int().nonnegative(),
  events: z.array(foreignKey(() => EventSchema)),
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
  // This refine is a check to make sure that the value provided
  // matches the one we expect to receive. It just check that the one we
  // want is not null and the rest are.
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
export type ProductionWithMeta = z.infer<ReturnType<typeof ProductionSchema.withMeta>>;

export type FieldType = z.infer<typeof FieldTypeSchema>;

export type CustomProductionFieldDefinition = z.infer<typeof CustomProductionFieldDefinitionSchema>;
export type CustomProductionFieldDefinitionWithMeta = z.infer<ReturnType<typeof CustomProductionFieldDefinitionSchema.withMeta>>;

export type CustomProductionField = z.infer<typeof CustomProductionFieldSchema>;
export type CustomProductionFieldWithMeta = z.infer<ReturnType<typeof CustomProductionFieldSchema.withMeta>>;
