import { requestSchema, requestById, RequestBody, RequestDescription, protectedRequest } from "@/docs/helpers.js";
import { ReplaceTagTypeBodySchema } from "../handlers/replace.js";
import { sharedRequestSchema, returnsTagType } from "./shared.js";

export const replaceTagTypeDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(ReplaceTagTypeBodySchema),
  returnsTagType,
  protectedRequest,
  new RequestDescription("Replaces an existing tag type's name and returns the updated record."),
);