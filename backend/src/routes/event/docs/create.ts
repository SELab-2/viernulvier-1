import { requestSchema, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { EventCreateSchema } from "../handlers/helper.js";
import { returnsEvent, sharedRequestSchema } from "./shared.js";

export const createEventDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(EventCreateSchema),
  returnsEvent,
  new RequestDescription("Creates a new event in the database and returns the created record."),
);