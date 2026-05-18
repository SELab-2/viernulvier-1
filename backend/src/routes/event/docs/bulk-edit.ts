import { requestSchema, RequestBody, RequestDescription, protectedRequest } from "@/docs/helpers.js";
import { EventBulkUpdateSchema } from "../handlers/helper.js";
import { returnsEventArray, sharedRequestSchema } from "./shared.js";


export const editEventsDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(
    EventBulkUpdateSchema.in,
  ),
  returnsEventArray,
  protectedRequest,
  new RequestDescription("Updates certain fields from multiple events by ID in the database. Returns the updated events."),
);