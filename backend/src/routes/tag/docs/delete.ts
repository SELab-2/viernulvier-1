import { protectedRequest, requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsTag } from "./shared.js";

export const deleteTagDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsTag,
  protectedRequest,
  new RequestDescription("Deletes a tag by ID and returns the deleted record."),
);