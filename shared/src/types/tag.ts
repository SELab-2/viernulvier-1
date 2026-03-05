import z from "zod"
import { primaryKey, foreignKey, languageMap } from "./helpers";
import { createSchema } from ".";

export const TagTypeSchema = createSchema({
    id: primaryKey(),
    name: z.string(),
    visible: z.boolean(),
});

export type TagType = z.infer<typeof TagTypeSchema>;

export const TagSchema = createSchema({
    id: primaryKey(),
    name: languageMap,
    type: foreignKey(() => TagTypeSchema),
});

export type Tag = z.infer<typeof TagSchema>;