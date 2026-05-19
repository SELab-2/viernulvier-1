import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestTag, RequestResponse } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { EventPriceSchema } from "@viernulvier/shared/index.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("event price"),
);

export const returnsEventPrice = new RequestResponse(HttpSuccess.OK, EventPriceSchema);

export const returnsEventPriceArray = new RequestResponse(HttpSuccess.OK, EventPriceSchema.array());