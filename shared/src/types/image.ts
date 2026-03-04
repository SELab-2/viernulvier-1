import z from "zod";
import { MetadataSchema } from "./metadata.js";
import { ProductionSchema } from "./production.js";

export const ImageSchema = z.object({
  // metadata
  ...MetadataSchema.shape,

  // core fields
  id: z.number(),

  // relations
  production: z.number(),

  // image data
  res: z.string().max(16),
});

export type Image = z.infer<typeof ImageSchema>;
