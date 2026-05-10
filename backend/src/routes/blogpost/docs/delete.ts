import { protectedRequest, requestById, RequestDescription, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema } from "./shared.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { BlogPostSchema } from "@viernulvier/shared/index.js";

export const deleteBlogPostDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, BlogPostSchema),
  protectedRequest,
  new RequestDescription("Deletes a blogpost by ID and returns the deleted record."),
);
