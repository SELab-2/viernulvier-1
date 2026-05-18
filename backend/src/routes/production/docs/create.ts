import { protectedRequest, RequestBody, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsProduction, sharedRequestSchema } from "./shared.js";
import { CreateProductionBodySchema } from "../handlers/body-schema.js";

export const createProductionDocs = requestSchema(
  sharedRequestSchema,
  returnsProduction,
  new RequestBody(CreateProductionBodySchema),
  protectedRequest,
  new RequestDescription("Creates a new production and returns the created record."),
);