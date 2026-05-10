import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestTag, RequestResponse } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { BlogPostWithBackwardsRefsSchema } from "@viernulvier/shared/index.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("blogpost"),
);

export const returnsBlogPost = new RequestResponse(HttpSuccess.OK, BlogPostWithBackwardsRefsSchema);

export const returnsBlogPostArray = new RequestResponse(HttpSuccess.OK, BlogPostWithBackwardsRefsSchema.array());