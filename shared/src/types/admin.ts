import z from "zod";

import { primaryKey } from "./helpers.js";
import { createSchema } from "./metadata.js";

export const AdminBase = {
  id: primaryKey().describe("Primary key of admin."),
  username: z.string().max(32).describe("Username of admin."),
  profile_picture: z.url().max(2048).nullable().describe("Profile picture (url) of admin."),
};

export const AdminSchema = createSchema(AdminBase);

export type Admin = z.infer<typeof AdminSchema>;
export type AdminWithMeta = z.infer<ReturnType<typeof AdminSchema.withMeta>>;
