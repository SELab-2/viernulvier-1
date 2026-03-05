import z from "zod";
import { AdminSchema } from "./index.js";
import { foreignKey } from "./helpers.js";

export const MetadataShape = {
  created_by: foreignKey(() => AdminSchema),
  created_at: z.date(),
  updated_by: foreignKey(() => AdminSchema),
  updated_at: z.date(),
};

// use this createSchema({...}) function instead of z.object({...}) to create new Schema's
export function createSchema<T extends z.ZodRawShape>(shape: T) {
  const base = z.object(shape);
  return Object.assign(base, {
    withMeta: () => base.extend(MetadataShape),
  });
}
