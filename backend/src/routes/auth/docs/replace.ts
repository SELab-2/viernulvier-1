import { requestSchema, RequestBody, RequestDescription, requestById } from "@/docs/helpers.js";
import { ReplaceAdminBodySchema } from "../handlers/replace.js";
import {  returnsAdmin, sharedRequestSchema } from "./shared.js";

export const replaceAdminDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(ReplaceAdminBodySchema),
  returnsAdmin,
  new RequestDescription("Replace an admin by ID"),
);