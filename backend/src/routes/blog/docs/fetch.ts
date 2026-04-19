import { requestSchema, requestById, RequestDescription, RequestResponse, protectedRequest } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsBlog, returnsBlogArray } from "./shared.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { BlogSchema } from "@viernulvier/shared/index.js";

export const fetchBlogDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsBlog,
  new RequestDescription("Fetches a single blog by ID."),
);

export const fetchBlogWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, BlogSchema.withMeta()),
  protectedRequest,
  new RequestDescription("Fetches a single blog by ID, including metadata."),
);

export const fetchBlogsDocs = requestSchema(
  sharedRequestSchema,
  returnsBlogArray,
  new RequestDescription("Fetches a list of blogs."),
);