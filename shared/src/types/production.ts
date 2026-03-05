import z from "zod";
import { createSchema } from "./index.js";
import { foreignKey, primaryKey } from "./helpers.js";

// A way to be more strict about the types we allow in our language maps.
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

const BaseFields = z.object({
  field_definition_id: foreignKey(() => CustomProductionFieldDefinitionSchema),
  production_id: foreignKey(() => ProductionSchema),
});

const CustomProductionFieldSchemaBase = z
  .object({
    ...BaseFields.shape,

    type: FieldTypeSchema,

    value_bool: z.boolean().nullable(),
    value_number: z.number().nullable(),
    value_string: z.string().nullable(),
    value_json: z.json().nullable(),
  })
  .refine((schema) => {
    // This refine is a check to make sure that the value provided
    // matches the one we expect to receive. It just check that the one we
    // want is not null and the rest are.
    return (
      schema[`value_${schema.type}`] != null &&
      Object.entries(schema)
        .filter(
          ([key, _]) =>
            !(key.startsWith("value") && !key.endsWith(schema.type)),
        )
        .reduce((acc, [_, val]) => acc && val == null, true)
    );
  });

const CustomProductionFieldSchemaResult = z.discriminatedUnion("type", [
  BaseFields.extend({ type: z.literal("bool"), value: z.boolean() }),
  BaseFields.extend({ type: z.literal("number"), value: z.number() }),
  BaseFields.extend({ type: z.literal("string"), value: z.string() }),
  BaseFields.extend({ type: z.literal("json"), value: z.json() }),
]);

export const CustomProductionFieldSchema = z.codec(
  CustomProductionFieldSchemaBase,
  CustomProductionFieldSchemaResult,
  {
    decode: (schema) => {
      return {
        ...schema,
        value: schema[`value_${schema.type}`],
      } as z.infer<typeof CustomProductionFieldSchemaResult>;
    },
    encode: (data) => {
      const type = data.type;
      return {
        field_definition_id: data.field_definition_id,
        production_id: data.production_id,
        type: type,
        value_bool: type === "bool" ? data.value : null,
        value_number: type === "number" ? data.value : null,
        value_string: type === "string" ? data.value : null,
        value_json: type === "json" ? data.value : null,
      } as z.infer<typeof CustomProductionFieldSchemaBase>;
    },
  },
);

export type Production = z.infer<typeof ProductionSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type CustomProductionFieldDefinition = z.infer<
  typeof CustomProductionFieldDefinitionSchema
>;
export type CustomProductionField = z.infer<typeof CustomProductionFieldSchema>;

CustomProductionFieldSchema.decode({
  type: "number",
  production_id: 0,
  value_string: null,
  value_bool: null,
  value_json: null,
  value_number: 10,
  field_definition_id: 10,
}).value;
