import { requestSchema, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { CreateHallBodySchema } from "../handlers/create.js";
import { sharedRequestSchema, returnsHall } from "./shared.js";

export const createHallDocs = requestSchema(
  sharedRequestSchema,
  returnsHall,
  new RequestBody(CreateHallBodySchema),
  new RequestDescription("Creates a new hall and returns the created record."),
);