import { CombinedRequestSchema, DefaultRequestErrorMessages, requestSchema, RequestTag } from "@/docs/helpers.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("media"),
);

export const mediaDocs = requestSchema(
  sharedRequestSchema,
)