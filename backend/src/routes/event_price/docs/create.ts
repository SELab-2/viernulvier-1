import { requestSchema, RequestBody, RequestDescription, protectedRequest } from "@/docs/helpers.js";
import { EventPriceCreateSchema } from "../handlers/helper.js";
import { sharedRequestSchema, returnsEventPrice } from "./shared.js";

export const createEventPriceDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(EventPriceCreateSchema),
  returnsEventPrice,
  protectedRequest,
  new RequestDescription("Creates a new event price and returns the created record."),
);