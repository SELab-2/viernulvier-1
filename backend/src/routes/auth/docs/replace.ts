import { requestSchema, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { ReplaceAdminBodySchema } from "../handlers/replace.js";
import { requestById, returnsAdmin, sharedRequestSchema } from "./shared.js";

export const replaceAdminDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(ReplaceAdminBodySchema),
  returnsAdmin,
  new RequestDescription("Replace an admin by ID"),
);