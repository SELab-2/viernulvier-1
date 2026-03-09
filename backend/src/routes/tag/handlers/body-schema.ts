import z from "zod";
import { languageMap } from "@viernulvier/shared/types/helpers.js";

export const CreateTagBodySchema = z.object({
  name: languageMap,
  type: z.number(),
  productions: z.array(z.number()).optional(),
});

export const EditTagBodySchema = z.object({
  name: languageMap.optional(),
  type: z.number().optional(),
  productions: z.array(z.number()).optional(),
});