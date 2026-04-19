import { requestSchema, requestById, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { EditBlogBodySchema } from "../handlers/edit.js";
import { sharedRequestSchema, returnsBlog } from "./shared.js";

export const editBlogDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsBlog,
  new RequestBody(EditBlogBodySchema),
  new RequestDescription("Updates an existing blog and returns the updated record."),
);