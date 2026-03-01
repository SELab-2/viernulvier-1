import z from "zod"
import { MetadataSchema } from "./metadata";

export const TagTypeSchema = MetadataSchema.extend({
    id: z.number(),
    name: z.string(),
    visible: z.boolean(),
});

export type TagType = z.infer<typeof TagTypeSchema>;

export const TagSchema = MetadataSchema.extend({
    id: z.number(),
    name: z.string(),
    type: TagTypeSchema,
});

export type Tag = z.infer<typeof TagSchema>;