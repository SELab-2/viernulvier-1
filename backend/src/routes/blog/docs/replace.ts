import { requestSchema, requestById, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { ReplaceBlogBodySchema } from "../handlers/replace.js";
import { sharedRequestSchema, returnsBlog } from "./shared.js";

export const replaceBlogDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsBlog,
  new RequestBody(ReplaceBlogBodySchema),
  new RequestDescription(`Replaces an existing blog's data and returns the updated record.
  Unlike \`editBlog\`, all fields are required and will be overwritten.`),
);