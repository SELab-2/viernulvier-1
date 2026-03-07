import z from "zod";

import { AdminSchema } from "./admin.js";
import { foreignKey } from "./helpers.js";

export const MetadataShape = {
  created_by: foreignKey(() => AdminSchema),
  created_at: z.coerce.date(),
  updated_by: foreignKey(() => AdminSchema),
  updated_at: z.coerce.date(),
};

/**
 * Creates a Zod schema with an additional `withMeta` method that extends the schema with metadata fields.
 * Use this instead of `z.object({...})` when defining new schemas.
 *
 * @param shape - The Zod raw shape to create the schema from
 * @returns A Zod object schema with a non-enumerable `withMeta` method
 */
export function createSchema<T extends z.ZodRawShape>(shape: T) {
  const base = z.object(shape);
  return Object.defineProperty(base, "withMeta", {
    value: () => base.extend(MetadataShape),
    writable: false,
    enumerable: false,
    configurable: false,
  }) as SchemaWithMeta<T>;
}

export type SchemaWithMeta<T extends z.ZodRawShape> = z.ZodObject<T> & {
  withMeta: () => z.ZodObject<T & typeof MetadataShape>;
};
