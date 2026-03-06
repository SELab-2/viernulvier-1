import z from "zod";
import { createSchema, ProductionSchema } from "./index.js";
import type { SchemaWithMeta } from "./index.js";
import { primaryKey, foreignKey } from "./helpers.js";

export const ImageSchema: SchemaWithMeta<any> = createSchema({
  id: primaryKey(),

  production_id: foreignKey(() => ProductionSchema),

  res: z
    .string()
    .max(16)
}).refine((img) => {
  // resolution should not be empty or whitespace
  return img.res.trim().length > 0;
});

export type Image = z.infer<typeof ImageSchema>;
export type ImageWithMeta = z.infer<ReturnType<typeof ImageSchema.withMeta>>;
