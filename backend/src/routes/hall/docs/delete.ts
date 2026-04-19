import { requestSchema, requestById, RequestDescription } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsHall } from "./shared.js";

export const deleteHallDocs = requestSchema(
  sharedRequestSchema,
  returnsHall,
  requestById,
  new RequestDescription("Deletes a hall by its ID and returns the deleted record."),
);