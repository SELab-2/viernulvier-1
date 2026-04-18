import { RequestDescription, requestSchema, requestById } from "@/docs/helpers.js";
import { returnsAdminArray, returnsAdmin, sharedRequestSchema } from "./shared.js";


const fetchAdminsDocs = requestSchema(
  sharedRequestSchema,
  returnsAdminArray,
  new RequestDescription("Fetch all admins"),
);

const fetchAdminDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsAdmin,
  new RequestDescription("Fetch an admin by ID"),
);

const fetchAdminWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsAdmin,
  new RequestDescription("Fetch an admin with metadata by ID"),
);

const fetchCurrentlyLoggedInAdminDocs = requestSchema(
  sharedRequestSchema,
  returnsAdmin,
  new RequestDescription("Fetch the currently authenticated admin"),
);

const fetchCurrentlyLoggedInAdminWithMetaDocs = requestSchema(
  sharedRequestSchema,
  returnsAdmin,
  new RequestDescription("Fetch the currently authenticated admin with metadata"),
);


export {
  fetchAdminsDocs,
  fetchAdminDocs,
  fetchAdminWithMetaDocs,
  fetchCurrentlyLoggedInAdminDocs,
  fetchCurrentlyLoggedInAdminWithMetaDocs,
}