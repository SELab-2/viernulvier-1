import { requestSchema, RequestResponse, RequestDescription, RequestBody, protectedRequest } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { sharedRequestSchema } from "./shared.js";
import { CreateAdminBodySchema } from "../handlers/create.js";

export const createAdminDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(CreateAdminBodySchema),
  // TODO : This should maybe be changed to a 201 Created, but as of now thats now how the handler works, so we will keep it as 200 OK for now. --- IGNORE ---
  new RequestResponse(HttpSuccess.OK, AdminSchema),
  protectedRequest,
  new RequestDescription("Create a new admin."),
);