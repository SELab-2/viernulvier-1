import { ProductionSchema } from "./production.js";
import z from "zod";
import {
  primaryKey,
  foreignKey,
  languageMap,
  type ForeignKey,
} from "./helpers.js";
import { createSchema } from "./metadata.js";

export const TagTypeSchema = createSchema({
  id: primaryKey(),
  name: languageMap,
});

export type TagType = z.infer<typeof TagTypeSchema>;
export type TagTypeWithMeta = z.infer<
  ReturnType<typeof TagTypeSchema.withMeta>
>;

type TagProductionsSchema = z.ZodOptional<
  z.ZodArray<ForeignKey<typeof ProductionSchema>>
>;

export const TagSchema = createSchema({
  id: primaryKey(),
  old_id: z.int().nonnegative().nullable(),
  name: languageMap,
  get tag_type(): ForeignKey<typeof TagTypeSchema> {
    return foreignKey(() => TagTypeSchema);
  },
  public: z.boolean(),
  /** Distinct productions linked to this tag; set when `includeProductionCount=true` on list endpoints. */
  production_count: z.number().int().nonnegative().optional(),

  get productions(): TagProductionsSchema {
    return z.array(foreignKey(() => ProductionSchema)).optional();
  },
});

export type Tag = z.infer<typeof TagSchema>;
export type TagWithMeta = z.infer<ReturnType<typeof TagSchema.withMeta>>;
