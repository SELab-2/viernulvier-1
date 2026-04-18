import { requestSchema, RequestDescription, requestById } from "@/docs/helpers.js";
import { returnsAdmin, sharedRequestSchema } from "./shared.js";

export const deleteAdminDocs =  requestSchema(
  sharedRequestSchema,
  requestById,
  returnsAdmin,
  new RequestDescription("Delete an admin by ID"),
);