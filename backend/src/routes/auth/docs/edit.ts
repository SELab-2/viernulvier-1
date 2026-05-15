import { RequestBody, RequestDescription, requestSchema, requestById, protectedRequest, RequestResponse } from "@/docs/helpers.js";
import {  returnsAdmin, sharedRequestSchema } from "./shared.js";
import { EditAdminBodySchema, EditOwnPasswordSchema } from "../handlers/edit.js";
import { HttpSuccess } from "@/routes/helpers.js";
import z from "zod";

export const editAdminDocs =  requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EditAdminBodySchema),
  returnsAdmin,
  protectedRequest,
  new RequestDescription("Edit an admin by ID"),
);

export const editOwnPasswordAdminDocs =  requestSchema(
  sharedRequestSchema,
  new RequestBody(EditOwnPasswordSchema),
  new RequestResponse(HttpSuccess.NoContent, z.symbol()),
  protectedRequest,
  new RequestDescription("Edits the current logged in admin's password and returns an empty 204 No Content."),
);