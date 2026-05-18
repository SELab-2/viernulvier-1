import { requestSchema, requestById, RequestBody, RequestDescription, protectedRequest } from "@/docs/helpers.js";
import { EditBlogPostBodySchema } from "../handlers/edit.js";
import { sharedRequestSchema, returnsBlogPost } from "./shared.js";

export const editBlogPostDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EditBlogPostBodySchema),
  returnsBlogPost,
  protectedRequest,
  new RequestDescription("Edits a blogpost by ID and returns the edited record."),
);