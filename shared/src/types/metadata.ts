import z from "zod";
import { AdminSchema } from "./index.js";

export const MetadataSchema = z.object({
  created_by: AdminSchema,
  created_at: z.date(),
  updated_by: AdminSchema,
  updated_at: z.date(),
});
