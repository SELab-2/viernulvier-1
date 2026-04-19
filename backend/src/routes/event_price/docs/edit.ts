import { RequestBody, requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsEventPrice, sharedRequestSchema } from "./shared.js";
import { EventPriceUpdateSchema } from "../handlers/edit.js";

export const editEventPriceDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EventPriceUpdateSchema),
  returnsEventPrice,
  new RequestDescription("Updates certain fields from a single event price by ID in the database. Returns `null` when the event price does not exist or validation fails."),
);