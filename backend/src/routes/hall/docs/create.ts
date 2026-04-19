import { requestSchema, RequestBody, RequestDescription, protectedRequest } from "@/docs/helpers.js";
import { CreateHallBodySchema } from "../handlers/create.js";
import { sharedRequestSchema, returnsHall } from "./shared.js";

export const createHallDocs = requestSchema(
  sharedRequestSchema,
  returnsHall,
  new RequestBody(CreateHallBodySchema),
  protectedRequest,
  new RequestDescription("Creates a new hall and returns the created record."),
);