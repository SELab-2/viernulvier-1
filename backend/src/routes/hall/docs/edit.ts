import { requestSchema, requestById, RequestBody, RequestDescription, protectedRequest } from "@/docs/helpers.js";
import { EditHallBodySchema } from "../handlers/edit.js";
import { sharedRequestSchema, returnsHall } from "./shared.js";

export const editHallDocs = requestSchema(
  sharedRequestSchema,
  returnsHall,
  requestById,
  new RequestBody(EditHallBodySchema),
  protectedRequest,
  new RequestDescription("Updates an existing hall and returns the updated record."),
);