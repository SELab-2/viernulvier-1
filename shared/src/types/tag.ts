import z from "zod"
import { AdminSchema } from "./admin";

export const TagTypeSchema = z.object({
    created_by: AdminSchema,
    created_at: z.date(),
    updated_at: z.date(),

    id: z.number(),
    name: z.string(),
    visible: z.boolean(),
});

export type TagType = z.infer<typeof TagTypeSchema>;

export const TagSchema = z.object({
    created_by: AdminSchema,
    created_at: z.date(),
    updated_at: z.date(),

    id: z.number(),
    name: z.string(),
    type: TagTypeSchema,
});

export type Tag = z.infer<typeof TagSchema>;