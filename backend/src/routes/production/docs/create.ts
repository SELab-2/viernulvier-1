import { RequestBody, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsProduction, sharedRequestSchema } from "./shared.js";
import { CreateProductionBodySchema } from "../handlers/body-schema.js";

export const createProductionDocs = requestSchema(
  sharedRequestSchema,
  returnsProduction,
  new RequestBody(CreateProductionBodySchema),
  new RequestDescription("Creates a new production and returns the created record."),
);