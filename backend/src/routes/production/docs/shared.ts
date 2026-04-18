import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestTag } from "@/docs/helpers.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("production"),
);