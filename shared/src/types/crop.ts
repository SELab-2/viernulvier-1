import z from "zod";
import { createSchema } from "./metadata.js";
import { ImageSchema } from "./image.js";
import { primaryKey, foreignKey } from "./helpers.js";

export const CropSchema = createSchema({
  id: primaryKey(),

  image: foreignKey(() => ImageSchema),

  url: z.url().min(1).max(2048),
});

export type Crop = z.infer<typeof CropSchema>;
export type CropWithMeta = z.infer<ReturnType<typeof CropSchema.withMeta>>;
