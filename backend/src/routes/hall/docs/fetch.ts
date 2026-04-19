import { protectedRequest, requestById, RequestDescription, RequestQueryString, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsHall, returnsHallArray } from "./shared.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { HallSchema } from "@viernulvier/shared/index.js";
import { HallsListQuerySchema } from "../handlers/fetch.js";

export const fetchHallDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsHall,
  new RequestDescription("Fetches a single hall by its ID"),
);

export const fetchHallWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, HallSchema.withMeta(), true),
  protectedRequest,
  new RequestDescription("Fetches a single hall by its ID, including metadata."),
);

export const fetchHallsDocs = requestSchema(
  sharedRequestSchema,
  new RequestQueryString(HallsListQuerySchema),
  returnsHallArray,
  new RequestDescription("Fetches all halls, optionally filtered by `old_id` query (legacy id)."),
);