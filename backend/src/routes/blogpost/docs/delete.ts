import { requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsBlogPost, sharedRequestSchema } from "./shared.js";

export const deleteBlogPostDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsBlogPost,
  new RequestDescription("Deletes a blogpost by ID and returns the deleted record."),
);
