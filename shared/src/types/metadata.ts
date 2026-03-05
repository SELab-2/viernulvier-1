import z from "zod";
import { AdminSchema } from "./index.js";

export const MetadataShape = {
  created_by: AdminSchema,
  created_at: z.date(),
  updated_by: AdminSchema,
  updated_at: z.date(),
};

// helper function to add a withMeta() function to the Schema's
export function createSchema<T extends z.ZodRawShape>(shape: T) {
  const base = z.object(shape);
  return Object.assign(base, {
    withMeta: () => base.extend(MetadataShape),
  });
}
