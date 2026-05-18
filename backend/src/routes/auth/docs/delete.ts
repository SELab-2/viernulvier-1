import { requestSchema, RequestDescription, requestById, protectedRequest, RequestError } from "@/docs/helpers.js";
import { returnsAdmin, sharedRequestSchema } from "./shared.js";
import { HttpClientError } from "@/routes/helpers.js";

export const deleteAdminDocs =  requestSchema(
  sharedRequestSchema,
  requestById,
  returnsAdmin,
  protectedRequest,
  new RequestError(HttpClientError.Conflict),
  new RequestDescription("Delete an admin by ID"),
);