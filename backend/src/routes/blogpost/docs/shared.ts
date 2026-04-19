import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestTag, RequestResponse } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { BlogPostSchema } from "@viernulvier/shared/index.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("blogpost"),
);

export const returnsBlogPost = new RequestResponse(HttpSuccess.OK, BlogPostSchema);

export const returnsBlogPostArray = new RequestResponse(HttpSuccess.OK, BlogPostSchema.array());