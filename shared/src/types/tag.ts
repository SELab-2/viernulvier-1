import z from "zod";
import { primaryKey, foreignKey, languageMap } from "./helpers.js";
import { createSchema, ProductionSchema } from "./index.js";

export const TagTypeSchema = createSchema({
    id: primaryKey(),
    name: languageMap,
    visible: z.boolean(),
});

export type TagType = z.infer<typeof TagTypeSchema>;
export type TagTypeWithMeta = z.infer<ReturnType<typeof TagTypeSchema.withMeta>>;

export const TagSchema = createSchema({
    id: primaryKey(),
    name: languageMap,
    type: foreignKey(() => TagTypeSchema),
});

export type Tag = z.infer<typeof TagSchema>;
export type TagWithMeta = z.infer<ReturnType<typeof TagSchema.withMeta>>;

export const ProductionTagSchema = createSchema({
    production_id: foreignKey(() => ProductionSchema),
    tag_id: foreignKey(() => TagSchema),
});

export type ProductionTag = z.infer<typeof ProductionTagSchema>;
export type ProductionTagWithMeta = z.infer<ReturnType<typeof ProductionTagSchema.withMeta>>;