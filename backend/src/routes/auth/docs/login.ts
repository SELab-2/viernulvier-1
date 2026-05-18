import { RequestBody, RequestDescription, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema } from "./shared.js";
import z from "zod";
import { LoginBodySchema } from "../handlers/login.js";

export const loginDocs = requestSchema(
  sharedRequestSchema,
  new RequestBody(LoginBodySchema),
  new RequestResponse(200, z.object({ token: z.string() })),
  new RequestDescription("Authenticate an admin by username and password, sets a session cookie, and returns a signed JWT. The token contains the admin's `id`, `username`, `super`, and a unique `jti` claim used for revocation on logout. Clients that cannot use cookies should store the returned token and pass it via the `Authorization: Bearer <token>` header."),
);