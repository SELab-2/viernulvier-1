import { protectedRequest, RequestBody, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { CreateBlogBodySchema } from "../handlers/create.js";
import { sharedRequestSchema, returnsBlog } from "./shared.js";

export const createBlogDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(CreateBlogBodySchema),
  returnsBlog,
  protectedRequest,
  new RequestDescription("Creates a new blog and returns the created record."),
);
