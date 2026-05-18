import { protectedRequest, requestById, RequestDescription, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { sharedRequestSchema, returnsTagType, returnsTagTypeArray } from "./shared.js";

export const fetchTagTypeDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsTagType,
  new RequestDescription("Fetches a single tag type by ID."),
);

export const fetchTagTypeWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, TagTypeSchema.withMeta()),
  protectedRequest,
  new RequestDescription("Fetches a single tag type by ID, including metadata."),
);

export const fetchTagTypesDocs = requestSchema(
  sharedRequestSchema,
  returnsTagTypeArray,
  new RequestDescription("Fetches all tag types."),
);