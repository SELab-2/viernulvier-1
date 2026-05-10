import { RequestDescription, requestSchema, requestById, protectedRequest, RequestResponse } from "@/docs/helpers.js";
import { returnsAdminArray, returnsAdmin, sharedRequestSchema } from "./shared.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { HttpSuccess } from "@/routes/helpers.js";


const fetchAdminsDocs = requestSchema(
  sharedRequestSchema,
  returnsAdminArray,
  protectedRequest,
  new RequestDescription("Fetch all admins"),
);

const fetchAdminDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsAdmin,
  protectedRequest,
  new RequestDescription("Fetch an admin by ID"),
);

const fetchAdminWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, AdminSchema.withMeta()),
  protectedRequest,
  new RequestDescription("Fetch an admin with metadata by ID"),
);

const fetchCurrentlyLoggedInAdminDocs = requestSchema(
  sharedRequestSchema,
  returnsAdmin,
  protectedRequest,
  new RequestDescription("Fetch the currently authenticated admin"),
);

const fetchCurrentlyLoggedInAdminWithMetaDocs = requestSchema(
  sharedRequestSchema,
  new RequestResponse(HttpSuccess.OK, AdminSchema.withMeta()),
  protectedRequest,
  new RequestDescription("Fetch the currently authenticated admin with metadata"),
);


export {
  fetchAdminsDocs,
  fetchAdminDocs,
  fetchAdminWithMetaDocs,
  fetchCurrentlyLoggedInAdminDocs,
  fetchCurrentlyLoggedInAdminWithMetaDocs,
}