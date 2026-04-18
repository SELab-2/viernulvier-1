import { RequestBody, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { requestById, returnsAdminArray, sharedRequestSchema } from "./shared.js";
import { EditAdminBodySchema } from "../handlers/edit.js";

export const editAdminDocs =  requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EditAdminBodySchema),
  returnsAdminArray,
  new RequestDescription("Edit an admin by ID"),
);