import z from "zod";
import { languageMap } from "@viernulvier/shared/types/helpers.js";

export const CreateTagBodySchema = z.object({
  name: languageMap,
  type: z.number(),
});

export const EditTagBodySchema = CreateTagBodySchema.partial();