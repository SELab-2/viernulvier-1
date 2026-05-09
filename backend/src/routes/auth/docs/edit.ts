import { RequestBody, RequestDescription, requestSchema, requestById, protectedRequest } from "@/docs/helpers.js";
import {  returnsAdmin, sharedRequestSchema } from "./shared.js";
import { EditAdminBodySchema } from "../handlers/edit.js";

export const editAdminDocs =  requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EditAdminBodySchema),
  returnsAdmin,
  protectedRequest,
  new RequestDescription("Edit an admin by ID"),
);