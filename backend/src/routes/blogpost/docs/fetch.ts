import { requestSchema, requestById, RequestDescription, RequestResponse, protectedRequest } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsBlogPost, returnsBlogPostArray } from "./shared.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { BlogPostSchema } from "@viernulvier/shared/index.js";

export const fetchBlogPostDocs =  requestSchema(
  sharedRequestSchema,
  requestById,
  returnsBlogPost,
  new RequestDescription("Fetches a single blogpost by ID and returns it."),
);

export const fetchBlogPostWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, BlogPostSchema.withMeta()),
  protectedRequest,
  new RequestDescription("Fetches a single blogpost by ID and returns it with metadata."),
);

export const fetchBlogPostsDocs = requestSchema(
  sharedRequestSchema,
  returnsBlogPostArray,
  new RequestDescription("Fetches a list of all blogposts."),
);