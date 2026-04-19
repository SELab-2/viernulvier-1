import { requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsBlog } from "./shared.js";

export const deleteBlogDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsBlog,
  new RequestDescription("Deletes a blog by ID and returns the deleted record."),
);