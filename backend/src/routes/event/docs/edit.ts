import { requestSchema, RequestBody, RequestDescription, requestById } from "@/docs/helpers.js";
import { EventUpdateSchema } from "../handlers/edit.js";
import { returnsEvent, sharedRequestSchema } from "./shared.js";

export const editEventDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EventUpdateSchema),
  returnsEvent,
  new RequestDescription("Updates certain fields from a single event by ID in the database. Returns the updated event, or `null` if not found or validation failed."),
);