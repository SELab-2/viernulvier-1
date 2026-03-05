import z from "zod"
import { primaryKey, foreignKey } from "./helpers";
import { createSchema, MetadataShape } from ".";

export const TagTypeSchema = createSchema({
    id: primaryKey(),
    name: z.string(),
    visible: z.boolean(),
});

export type TagType = z.infer<typeof TagTypeSchema>;

export const TagSchema = createSchema({
    id: primaryKey(),
    name: z.string(),
    type: foreignKey(() => TagTypeSchema),
});

export type Tag = z.infer<typeof TagSchema>;