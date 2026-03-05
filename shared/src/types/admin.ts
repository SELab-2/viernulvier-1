import z from "zod";
import { primaryKey } from "./helpers";
import { createSchema, MetadataShape } from ".";

export const AdminBase = {
  id: primaryKey(),
  username: z.string().max(32),
  profile_picture: z.url().max(2048).nullable(),
};

type AdminSchemaType = z.ZodObject<typeof AdminBase> & {
  withMeta: () => z.ZodObject<typeof AdminBase & typeof MetadataShape>;
};

export const AdminSchema: AdminSchemaType = createSchema(AdminBase);

export type Admin = z.infer<typeof AdminSchema>;
export type AdminWithMeta = z.infer<ReturnType<typeof AdminSchema.withMeta>>;
