import { protectedRequest, requestById, RequestDescription, RequestQueryString, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsHall, returnsHallArray } from "./shared.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { HallSchema, stringToInt } from "@viernulvier/shared/index.js";
import z from "zod";

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
  new RequestQueryString(z.object({old_id: stringToInt.optional()})),
  returnsHallArray,
  new RequestDescription("Fetches all halls, optionally filtered by `old_id` query (legacy id)."),
);