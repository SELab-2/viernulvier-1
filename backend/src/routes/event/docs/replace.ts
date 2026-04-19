import { requestSchema, requestById, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { EventCreateSchema } from "../handlers/helper.js";
import { sharedRequestSchema, returnsEvent } from "./shared.js";

export const replaceEventDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EventCreateSchema),
  returnsEvent,
  new RequestDescription("Replaces a single event by ID in the database. Returns the updated event, or `null` if not found or validation failed."),
);