import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestTag, RequestResponse } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("tag type"),
);

export const returnsTagType = new RequestResponse(HttpSuccess.OK, TagTypeSchema);

export const returnsTagTypeArray = new RequestResponse(HttpSuccess.OK, TagTypeSchema.array());