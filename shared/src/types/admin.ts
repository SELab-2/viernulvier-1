import z from "zod";

import { primaryKey } from "./helpers.js";
import { createSchema, _registerAdminSchema } from "./metadata.js";

export const AdminBase = {
  id: primaryKey().describe("Primary key of admin."),
  username: z.string().max(32).describe("Username of admin."),
  profile_picture: z.url().max(2048).nullable().describe("Profile picture (url) of admin."),
  super: z.boolean().describe("Whether admin has super privileges. (Being able to fetch, create, edit or delete other admins"),
};

export const AdminSchema = createSchema(AdminBase);
_registerAdminSchema(AdminSchema);

export type Admin = z.infer<typeof AdminSchema>;
export type AdminWithMeta = z.infer<ReturnType<typeof AdminSchema.withMeta>>;
