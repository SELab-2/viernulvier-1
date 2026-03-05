import z from "zod";

import { primaryKey } from "./helpers.js";
import { createSchema } from "./index.js";
import type { SchemaWithMeta } from "./index.js";

export const AdminBase = {
  id: primaryKey(),
  username: z.string().max(32),
  profile_picture: z.url().max(2048).nullable(),
};

export const AdminSchema: SchemaWithMeta<any> = createSchema(AdminBase);

export type Admin = z.infer<typeof AdminSchema>;
export type AdminWithMeta = z.infer<ReturnType<typeof AdminSchema.withMeta>>;
