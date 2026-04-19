import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestTag, RequestResponse } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { HallSchema } from "@viernulvier/shared/index.js";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("hall"),
);

export const returnsHall = new RequestResponse(HttpSuccess.OK, HallSchema);

export const returnsHallArray = new RequestResponse(HttpSuccess.OK, HallSchema.array());