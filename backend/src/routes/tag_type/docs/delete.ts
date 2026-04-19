import { requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsTagType, sharedRequestSchema } from "./shared.js";

export const deleteTagTypeDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsTagType,
  new RequestDescription("Deletes a tag type by ID and returns the deleted record."),
);