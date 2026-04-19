import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestTag, RequestResponse } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { TagSchema } from "@viernulvier/shared/index.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("tag"),
);

export const returnsTag = new RequestResponse(HttpSuccess.OK, TagSchema);

export const returnsTagArray = new RequestResponse(HttpSuccess.OK, TagSchema.array());