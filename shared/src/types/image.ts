import z from "zod";
import { createSchema } from "./metadata.js";
import { ProductionSchema } from "./production.js";
import { primaryKey, foreignKey } from "./helpers.js";

export const ImageSchema = createSchema({
  id: primaryKey(),

  old_id: z.int().nonnegative().nullable(),

  production: foreignKey(() => ProductionSchema),

  res: z 
    .string()
    .max(16),
}).refine((img) => {
  // resolution should not be empty or whitespace
  return img.res.trim().length > 0;
});

export type Image = z.infer<typeof ImageSchema>;
export type ImageWithMeta = z.infer<ReturnType<typeof ImageSchema.withMeta>>;
