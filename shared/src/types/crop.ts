import z from "zod";
import { MetadataSchema } from "./metadata.js";
import { ImageSchema } from "./image.js";

export const CropSchema = z.object({
  // metadata
  ...MetadataSchema.shape,

  // core fields
  id: z.number(),

  // relations
  image: z.lazy(() => ImageSchema),

  // crop data
  url: z.string().max(128),
});

export type Crop = z.infer<typeof CropSchema>;
