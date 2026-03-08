import { ProductionSchema } from "./production.js";
import z from "zod";
import {
  primaryKey,
  foreignKey,
  languageMap,
  type ForeignKey,
} from "./helpers.js";
import { createSchema } from "./index.js";

export const TagTypeSchema = createSchema({
  id: primaryKey(),
  name: languageMap,
  visible: z.boolean(),
});

export type TagType = z.infer<typeof TagTypeSchema>;
export type TagTypeWithMeta = z.infer<
  ReturnType<typeof TagTypeSchema.withMeta>
>;

export const TagSchema = createSchema({
  id: primaryKey(),
  name: languageMap,
  type: foreignKey(() => TagTypeSchema),
  get productions(): z.ZodArray<ForeignKey<typeof ProductionSchema>> {
    return z.array(foreignKey(() => ProductionSchema));
  },
});

export type Tag = z.infer<typeof TagSchema>;
export type TagWithMeta = z.infer<ReturnType<typeof TagSchema.withMeta>>;
