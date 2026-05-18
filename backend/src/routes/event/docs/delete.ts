import { protectedRequest, requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsEvent, sharedRequestSchema } from "./shared.js";

export const deleteEventDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsEvent,
  protectedRequest,
  new RequestDescription("Deletes a single event by ID from the database. Returns the deleted event, or `null` if not found or validation failed."),
);