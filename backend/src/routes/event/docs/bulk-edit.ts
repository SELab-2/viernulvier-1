import { requestSchema, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { EventBulkUpdateSchema } from "../handlers/bulk-edit.js";
import { returnsEventArray, sharedRequestSchema } from "./shared.js";

export const editEventsDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(EventBulkUpdateSchema),
  returnsEventArray,
  new RequestDescription("Updates certain fields from multiple events by ID in the database. Returns the updated events."),
);