import { protectedRequest, RequestBody, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsTag, sharedRequestSchema } from "./shared.js";
import { CreateTagBodySchema } from "../handlers/create.js";

export const createTagDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(CreateTagBodySchema),
  returnsTag,
  protectedRequest,
  new RequestDescription("Creates a new tag and returns the created record."),
);