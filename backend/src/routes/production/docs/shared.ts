import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestResponse, RequestTag } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { ProductionSchemaWithBackwardsRefs } from "@viernulvier/shared/index.js";
export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("production"),
);

export const returnsProduction = new RequestResponse(
  HttpSuccess.OK,
  ProductionSchemaWithBackwardsRefs,
  true,
);

export const returnsProductionArray = new RequestResponse(
  HttpSuccess.OK,
  ProductionSchemaWithBackwardsRefs.array(),
  true,
);