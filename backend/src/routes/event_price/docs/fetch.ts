import { requestById, RequestDescription, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { EventPriceSchema } from "@viernulvier/shared/index.js";
import { sharedRequestSchema, returnsEventPrice } from "./shared.js";

export const fetchEventPriceDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsEventPrice,
  new RequestDescription("Fetches a single event price by ID from the database. Returns `null` when the event price does not exist or validation fails."),
);

export const fetchEventPriceWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, EventPriceSchema.withMeta()),
  new RequestDescription("Fetches a single event price by ID including metadata fields. Returns `null` when the event price does not exist or validation fails."),
);

export const fetchAllEventPricesDocs = requestSchema(
  sharedRequestSchema,
  new RequestResponse(HttpSuccess.OK, EventPriceSchema.array()),
  new RequestDescription("Fetches all event prices from the database. Returns an empty array when parsing fails."),
);