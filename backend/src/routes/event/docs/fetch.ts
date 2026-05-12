import {
  requestById,
  RequestDescription,
  requestSchema,
  RequestResponse,
  RequestQueryString,
  protectedRequest,
} from "@/docs/helpers.js";
import {
  returnsEvent,
  returnsEventArray,
  sharedRequestSchema,
} from "./shared.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/index.js";
import { EventsListQuerySchema } from "../handlers/fetch.js";

export const fetchEventDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsEvent,
  new RequestDescription("Fetches a single event by ID from the database."),
);

export const fetchEventWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, EventSchema.withMeta()),
  protectedRequest,
  new RequestDescription(
    "Fetches a single event by ID from the database, with metadata.",
  ),
);

export const fetchEventsDocs = requestSchema(
  sharedRequestSchema,
  new RequestQueryString(EventsListQuerySchema),
  returnsEventArray,
  new RequestDescription(`* Fetches events, optionally filtered by production ID(s) or old_id.

 - \`production\`: one ID (\`?production=5\`) or comma-separated (\`?production=5,6,7\`), up to 100 distinct IDs.
 - \`old_id\`: filter by legacy id.
 - Neither: returns all events (ordered by \`starts_at\`).`),
);
