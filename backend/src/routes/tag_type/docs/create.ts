import { protectedRequest, RequestBody, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsTagType, sharedRequestSchema } from "./shared.js";
import { CreateTagTypeBodySchema } from "../handlers/create.js";

export const createTagTypeDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(CreateTagTypeBodySchema),
  returnsTagType,
  protectedRequest,
  new RequestDescription("Creates a new tag type and returns the created record."),
);