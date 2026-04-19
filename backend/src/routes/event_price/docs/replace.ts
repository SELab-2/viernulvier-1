import { requestSchema, requestById, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { EventPriceCreateSchema } from "../handlers/helper.js";
import { sharedRequestSchema, returnsEventPrice } from "./shared.js";

export const replaceEventPriceDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EventPriceCreateSchema),
  returnsEventPrice,
  new RequestDescription("Replaces an existing event price and returns the updated record. Returns `null` if the update failed or parsing failed."),
);