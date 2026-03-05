import z from "zod";
import { foreignKey, primaryKey } from "./helpers";

export const AdminBase = z.object({
  id: primaryKey(),
  username: z.string().max(32),
  profile_picture: z.url().max(2048).nullable(),
});

export const AdminSchema = Object.defineProperty(AdminBase, 'withMeta', {
  value: () => AdminBase.extend({
    created_by: foreignKey(() => AdminSchema),
    created_at: z.date(),
    updated_by: foreignKey(() => AdminSchema),
    updated_at: z.date(),
  }),
  writable: false,
  enumerable: false,
  configurable: false,
}) as typeof AdminBase & {
  withMeta: () => ReturnType<typeof AdminBase.extend<{
    created_by: ReturnType<typeof foreignKey>,
    created_at: z.ZodDate,
    updated_by: ReturnType<typeof foreignKey>,
    updated_at: z.ZodDate,
  }>>;
};

export type Admin = z.infer<typeof AdminSchema>;
export type AdminWithMeta = z.infer<ReturnType<typeof AdminSchema.withMeta>>;
