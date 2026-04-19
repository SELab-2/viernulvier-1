import { requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsEventPrice } from "./shared.js";

export const deleteEventPriceDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsEventPrice,
  new RequestDescription("Deletes a single event price by ID from the database. Returns `null` when the event price does not exist or validation fails."),
);