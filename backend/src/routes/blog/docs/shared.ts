import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestTag, RequestResponse } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { BlogSchema } from "@viernulvier/shared/index.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("blog"),
);

export const returnsBlog = new RequestResponse(HttpSuccess.OK, BlogSchema);

export const returnsBlogArray = new RequestResponse(HttpSuccess.OK, BlogSchema.array());