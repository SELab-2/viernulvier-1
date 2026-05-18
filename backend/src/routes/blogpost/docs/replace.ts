import { protectedRequest, RequestBody, requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsBlogPost, sharedRequestSchema } from "./shared.js";
import { ReplaceBlogPostBodySchema } from "../handlers/replace.js";

export const replaceBlogPostDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(ReplaceBlogPostBodySchema),
  returnsBlogPost,
  protectedRequest,
  new RequestDescription("Replaces a blogpost by ID and returns the updated record. All fields are required and will be overwritten."),
);