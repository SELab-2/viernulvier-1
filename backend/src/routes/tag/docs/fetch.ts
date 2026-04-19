import { protectedRequest, requestById, RequestDescription, RequestQueryString, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { sharedRequestSchema, returnsTag, returnsTagArray } from "./shared.js";
import { TagsListQuerySchema } from "../handlers/fetch.js";

export const fetchTagDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsTag,
  protectedRequest,
  new RequestDescription("Fetches a single tag by ID; non-public tags are included."),
);

export const fetchTagVisibleDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsTag,
  new RequestDescription("Fetches a single public tag by ID."),
);

export const fetchTagWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, TagSchema.withMeta()),
  protectedRequest,
  new RequestDescription("Returns a single tag with metadata by ID; non-public tags are included."),
);

export const fetchTagsDocs = requestSchema(
  sharedRequestSchema,
  new RequestQueryString(TagsListQuerySchema),
  returnsTagArray,
  protectedRequest,
  new RequestDescription(
    "Fetches tags, optionally filtered by `production` or by `old_id` + `tag_type` together. Non-public tags are included.",
  ),
);

export const fetchTagsVisibleDocs = requestSchema(
  sharedRequestSchema,
  new RequestQueryString(TagsListQuerySchema),
  returnsTagArray,
  new RequestDescription(
    "Fetches public tags, optionally filtered by `production` or by `old_id` + `tag_type` together.",
  ),
)