import z from "zod";
import { createSchema, ImageSchema } from "./index.js";
import type { SchemaWithMeta } from "./index.js";
import { primaryKey, foreignKey } from "./helpers.js";

export const CropSchema: SchemaWithMeta<any> = createSchema({
  id: primaryKey(),

  image_id: foreignKey(() => ImageSchema),

  url: z
    .string()
    .max(128)
    .url()
}).refine((crop) => {
  // extra sanity check
  return crop.url.length > 0;
});

export type Crop = z.infer<typeof CropSchema>;
export type CropWithMeta = z.infer<ReturnType<typeof CropSchema.withMeta>>;
