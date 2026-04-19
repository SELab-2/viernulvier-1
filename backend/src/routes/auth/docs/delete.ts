import { requestSchema, RequestDescription, requestById, protectedRequest } from "@/docs/helpers.js";
import { returnsAdmin, sharedRequestSchema } from "./shared.js";

export const deleteAdminDocs =  requestSchema(
  sharedRequestSchema,
  requestById,
  returnsAdmin,
  protectedRequest,
  new RequestDescription("Delete an admin by ID"),
);