import z from "zod";
import { foreignKey, primaryKey } from "./helpers";

export const AdminBase = z.object({
  id: primaryKey(),
  username: z.string().max(32),
  profile_picture: z.url().max(2048).nullable(),
});

export const AdminSchema = Object.assign(AdminBase, {
  withMeta: () =>
    AdminBase.extend({
      // METADATA
      // only time this is hardcoded to avoid infinite import loops
      // normally you would create the schema using createSchema() from metadata.ts instead of z.object()
      created_by: foreignKey(() => AdminSchema),
      created_at: z.date(),
      updated_by: foreignKey(() => AdminSchema),
      updated_at: z.date(),
    }),
});

export type Admin = z.infer<typeof AdminSchema>;
export type AdminWithMeta = z.infer<ReturnType<typeof AdminSchema.withMeta>>;
