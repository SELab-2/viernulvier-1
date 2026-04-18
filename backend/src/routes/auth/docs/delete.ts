import { requestSchema, RequestDescription } from "@/docs/helpers.js";
import { requestById, returnsAdmin, sharedRequestSchema } from "./shared.js";

export const deleteAdminDocs =  requestSchema(
  sharedRequestSchema,
  requestById,
  returnsAdmin,
  new RequestDescription("Delete an admin by ID"),
);