import z from "zod";
import { AdminSchema } from "./admin";
import { ProductionSchema } from "./production";

export const ImageSchema: z.ZodObject = z.object({
  // metadata
  created_by: z.lazy(() => AdminSchema),
  created_at: z.date(),
  updated_by: z.lazy(() => AdminSchema),
  updated_at: z.date(),

  // core fields
  id: z.number(),
  production: z.lazy(() => ProductionSchema),

  // image data
  res: z.string().max(16),
});

export type Image = z.infer<typeof ImageSchema>;
