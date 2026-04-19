import { protectedRequest, RequestBody, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { CreateBlogPostBodySchema } from "../handlers/create.js";
import { returnsBlogPost, sharedRequestSchema } from "./shared.js";

export const createBlogPostDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(CreateBlogPostBodySchema),
  returnsBlogPost,
  protectedRequest,
  new RequestDescription("Creates a new blogpost and returns the created blogpost."),
);