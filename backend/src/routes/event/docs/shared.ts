import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestResponse, RequestTag } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/index.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("event"),
);

export const returnsEvent = new RequestResponse(HttpSuccess.OK, EventSchema);

export const returnsEventArray = new RequestResponse(HttpSuccess.OK, EventSchema.array());