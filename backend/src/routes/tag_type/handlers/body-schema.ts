import z from "zod";
import { languageMap } from "@viernulvier/shared/types/helpers.js";

export const CreateTagTypeBodySchema = z.object({
  name: languageMap,
  visible: z.boolean(),
});

export const EditTagTypeBodySchema = CreateTagTypeBodySchema.partial();