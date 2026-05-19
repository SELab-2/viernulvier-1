# Architecture Overview

This document describes the full architecture of the **viernulvier-archive** application — the digital archive for [VIERNULVIER](https://viernulvier.be), an arts centre in Ghent, Belgium. It is intended as a reference for developers, reviewers, and anyone who wants to understand how the system is designed.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Repository Layout](#2-repository-layout)
3. [Monorepo Tooling](#3-monorepo-tooling)
4. [Shared Package](#4-shared-package-viernulviershared)
5. [Backend](#5-backend)
6. [Frontend](#6-frontend)
7. [Database](#7-database)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Docker & Containerization](#9-docker--containerization)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Branching Strategy](#11-branching-strategy)
12. [Testing Strategy](#12-testing-strategy)
13. [Environment Variables](#13-environment-variables)

---

## 1. High-Level Overview

The application is a full-stack web archive consisting of three layers:

```
┌─────────────────────────────────────────────────────┐
│                      Browser                        │
│             Vue 3 SPA (Vite, TypeScript)            │
└─────────────────┬───────────────────────────────────┘
                  │  HTTP / JSON  (proxied via /api)
┌─────────────────▼───────────────────────────────────┐
│                    Backend                          │
│           Fastify REST API (Node.js 24)             │
│     JWT auth · Zod validation · pg driver           │
└─────────────────┬───────────────────────────────────┘
                  │  SQL (pg)
┌─────────────────▼───────────────────────────────────┐
│                  PostgreSQL 18                      │
│         Managed via Postgrator migrations           │
└─────────────────────────────────────────────────────┘
```

A fourth, cross-cutting package (**shared**) provides Zod schemas and TypeScript types that are consumed by both the frontend and backend, guaranteeing type-safe contracts across the full stack.

All three services (frontend, backend, database) are orchestrated with **Docker Compose** and deployed via **GitHub Actions** to `viernulvier-archive.be`.

---

## 2. Repository Layout

The monorepo contains three main packages with domain-specific source, tests, and configuration:

- **`backend/`** — Fastify REST API. Source code is in `src/` (entry point, server setup, plugins, and domain-organized routes). SQL migrations live in `migrations/`, utility scripts in `scripts/`.
- **`frontend/`** — Vue 3 SPA. Source code in `src/`, UI mockups in `mock/`.
- **`shared/`** — Zod schemas and TypeScript types consumed by both backend and frontend. Contains no tests and no Docker image — validated indirectly through the other packages.

At the root level: Docker Compose files for production and development, pnpm workspace config, `.env.example`, CI/CD workflows in `.github/`, and helper shell scripts for starting dev containers and running migrations.

---

## 3. Monorepo Tooling

| Tool | Purpose |
|------|---------|
| **pnpm 10 (workspaces)** | Package manager with workspace support. The three packages (`backend`, `frontend`, `shared`) are linked automatically. |
| **TypeScript 6.x** | Strict mode across all packages. The shared package's `tsconfig.json` extends the backend's to keep compiler options consistent. |
| **ESLint 10** | Flat config with `@typescript-eslint`, `eslint-plugin-security` (backend), `eslint-plugin-vue` (frontend), and `eslint-plugin-tsdoc` (both). |
| **Vitest 4** | Test runner for both backend (Node environment) and frontend (jsdom environment). |

See config files: [backend/package.json](../backend/package.json), [frontend/package.json](../frontend/package.json), [shared/package.json](../shared/package.json).

### Workspace dependency graph

```
backend ──depends on──▶ @viernulvier/shared
frontend ─depends on──▶ @viernulvier/shared
```

The shared package exposes **raw TypeScript source** (not compiled output) via its `exports` map. This means consumers (backend via `tsx`, frontend via Vite) transpile it on-the-fly. This avoids a separate build step during development.

See workspace config: [pnpm-workspace.yaml](../pnpm-workspace.yaml) and root [package.json](../package.json).

---

## 4. Shared Package (`@viernulvier/shared`)

The shared package is the single source of truth for domain types and validation rules. It uses [Zod 4](https://zod.dev) to define schemas that serve as both **runtime validators** and **TypeScript type generators**.

See the shared schema helpers: [shared/src/types/metadata.ts](../shared/src/types/metadata.ts) and schema exports in [shared/src/types/index.ts](../shared/src/types/index.ts).

### 4.1 Domain entities

| Entity | Description |
|--------|-------------|
| **Admin** | CMS administrator account (`username`, `profile_picture`, `super`) |
| **Production** | Core archive object with multilingual content, `finalized`, legacy `old_id`, and backwards refs |
| **Event** / **EventPrice** | Scheduled occurrences and pricing records |
| **Hall** | Venue data for events |
| **Tag** / **TagType** | Classification system for productions |
| **Image** / **Crop** | Media assets and derived crop variants |
| **Blog** / **BlogPost** | Editorial content and production links |
| **CustomProductionFieldDefinition** / **CustomProductionField** | Dynamic per-production custom fields |

### 4.2 The `createSchema` / `withMeta` pattern

Every domain schema is created through `createSchema()` instead of `z.object()` directly. This factory attaches a non-enumerable `withMeta()` method that extends the schema with audit fields (`created_by`, `created_at`, `updated_by`, `updated_at`).

```typescript
const AdminSchema = createSchema({
  id: primaryKey(),
  username: z.string().max(32),
  profile_picture: z.url().nullable(),
});

type Admin = z.infer<typeof AdminSchema>;
// → { id: number; username: string; profile_picture: string | null }

type AdminWithMeta = z.infer<ReturnType<typeof AdminSchema.withMeta>>;
// → Admin & { created_by: number; created_at: Date; updated_by: number; updated_at: Date }
```

`MetadataShape` uses lazy admin registration (`_registerAdminSchema`) so metadata foreign keys can reference `AdminSchema` without circular import issues.

The shared package also provides helpers for foreign key relationships (lazy-evaluated to avoid circular dependencies), multilingual field validation (`languageMap`), and string-to-number codecs for route parameter parsing.

---

## 5. Backend

The backend is a **Fastify 5** REST API running on **Node.js 24**. It follows Fastify's plugin-based architecture.

Server entry and plugin registration: [backend/src/server.ts](../backend/src/server.ts).

### 5.1 Architecture

On startup the server registers plugins for **postgres** (connection pool via `@fastify/postgres`), **swagger docs**, **jwt/cookies** (`@fastify/jwt` + `@fastify/cookie`), **authorize** (a `preHandler` hook for protected routes), **S3/Garage integration**, and **multipart uploads**, followed by the route modules.

Key backend helpers and plugins: [backend/src/routes/helpers.ts](../backend/src/routes/helpers.ts), [backend/src/plugins/authorize.ts](../backend/src/plugins/authorize.ts), [backend/src/plugins/jwt.ts](../backend/src/plugins/jwt.ts).

Routes are organized by domain. Each domain has its own directory under `routes/` containing route definitions and a `handlers/` folder. The current modules are:

| Module | Prefix | Public endpoints | Protected endpoints |
|--------|--------|:----------------:|:-------------------:|
| **Media** | `/api/v1/image`, `/api/v1/crop`, `/media/crops/*` | Fetch media + crop proxy | CRUD for images/crops |
| **Production** | `/api/v1/production` | Fetch all/one | CRUD, bulk edit |
| **Event** | `/api/v1/event` | Fetch all/one | CRUD, bulk edit |
| **Event Prices** | `/api/v1/event/price` | Fetch all/one | CRUD |
| **Auth** | `/api/v1/auth` | Login, logout | Admin CRUD |
| **Tags** | `/api/v1/tag` | Fetch public tags | Full CRUD, fetch all |
| **Tag Types** | `/api/v1/tag/type` | Fetch all/one | CRUD |
| **Halls** | `/api/v1/hall` | Fetch all/one | CRUD |
| **Blog** | `/api/v1/blog` | Fetch all/one | CRUD |
| **Blog Posts** | `/api/v1/blogpost` | Fetch all/one | CRUD |

Every domain follows a consistent REST pattern: public GET endpoints for reading, and authenticated POST/PUT/PATCH/DELETE for writing. Most entities also expose a `/meta` variant that includes audit fields.

### 5.2 Helper functions

The `routes/helpers.ts` module provides the core request-handling utilities:

| Function | Purpose |
|----------|---------|
| `parseParams(request, schema)` | Validates URL parameters against a Zod object schema. Throws 400 on failure. |
| `parseUser(request)` | Validates and extracts JWT user payload (`id`) from `request.user`. |
| `parseSchema(server, schema, value, context)` | General-purpose Zod validation. Context determines error code (400 for request, 500 for database). |
| `buildQuery(server, queryConfig, [filterFields], resultSchema)` | Returns a reusable, type-safe query function. Validates input parameters, executes parameterized SQL, validates output rows. |
| `replyHandler(server, handler)` | Wraps async handlers. Converts `HttpError` to proper HTTP responses, returns 404 for null results. |
| `getMetadata(request)` | Extracts authenticated admin ID and timestamp for audit fields. |
| `HttpError` | Custom error class with an HTTP status code. Thrown inside handlers, caught by `replyHandler`. |
| `NO_CONTENT` | Sentinel used by handlers that should reply with HTTP 204. |

### 5.3 Password handling

Passwords are hashed with **bcrypt** (12 salt rounds). The login handler uses a constant-time dummy comparison on failed lookups to prevent timing-based user enumeration.

Password implementation: [backend/src/routes/auth/handlers/hash.ts](../backend/src/routes/auth/handlers/hash.ts).

---

## 6. Frontend

The frontend is a **Vue 3** single-page application (Composition API, `<script setup>`) built with **Vite** (v8 in the current repo) and TypeScript. It communicates with the backend through a Vite dev proxy (`/api` → backend container), which also handles cookie forwarding for authentication.

Frontend config: [frontend/vite.config.ts](../frontend/vite.config.ts), [frontend/package.json](../frontend/package.json), and mock docs [frontend/mock/README.md](../frontend/mock/README.md).

UI mockups and domain model documentation are in the `frontend/mock/` directory.

---

## 7. Database

The database is **PostgreSQL 18**, managed through **Postgrator** migrations stored in `backend/migrations/`. Migrations follow the `NNN.do.<name>.sql` / `NNN.undo.<name>.sql` convention and are run via `pnpm migrate` in the backend container.

See Compose and migrations: [docker-compose.yml](../docker-compose.yml) and [backend/migrations](../backend/migrations).

Every domain table includes four audit columns (`created_at`, `updated_at`, `created_by`, `updated_by`), mirrored in the shared package's `MetadataShape` / `withMeta()` pattern. Multilingual text fields are stored as `JSONB`. Deduplication against the external VIERNULVIER API uses `vendor_id` fields.

See [DATABASE.md](./DATABASE.md) for the full schema and design rationale.

---

## 8. Authentication & Authorization

### 8.1 Flow

```
┌────────┐    POST /api/v1/auth/login     ┌─────────┐
│ Client │ ──────────────────────────────▶ │ Backend │
│        │    { username, password }        │         │
│        │                                 │  1. Query admin by username
│        │                                 │  2. bcrypt.compare(password, hash)
│        │    Set-Cookie: session=<JWT>     │  3. Sign JWT { id, jti }
│        │ ◀────────────────────────────── │         │
└────────┘                                 └─────────┘
```

The signed JWT (HS256, 24 h expiry) is stored in an `httpOnly` session cookie. The payload currently contains the admin `id` and a unique `jti` claim (used for token denylist/revocation).

Protected routes use the `server.authorize` preHandler hook which verifies the token and populates `request.user`. Routes that require elevated privileges use `server.authorize({ super: true })`, which returns HTTP 403 when a valid authenticated admin is not super.

Passwords are hashed with **bcrypt** (12 salt rounds). Failed login attempts use a dummy bcrypt comparison to prevent timing-based user enumeration. The `JWT_SECRET` is generated via `crypto.randomBytes(32)` and must never be committed.

---

## 9. Docker & Containerization

### 9.1 Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `db` | `postgres:18` | `DB_PORT` (5432) | PostgreSQL database (bind-mounted to `./database_data`) |
| `backend` | Custom (Node.js 24) | `BACKEND_PORT` (3000) | REST API |
| `frontend` | Custom (Nginx / Vite) | `FRONTEND_PORT` (5173) | SPA serving |
| `garage` | `dxflrs/garage:v2.1.0` | 3900/3901/3903 | S3-compatible object storage |
| `garage-init` | `docker:27-cli` | - | One-shot container that initializes Garage credentials and keys |

All services communicate over the `viernulvier-network` bridge network.

### 9.2 Production builds

**Backend** (`backend/Dockerfile`) — three-stage build:

```
Stage 1 (deps):    Install pnpm, copy lockfiles, install dependencies
Stage 2 (build):   Copy source, run `tsc` to compile TypeScript
Stage 3 (runtime): node:24-slim, copy only compiled output + node_modules
```

**Frontend** (`frontend/Dockerfile`) — three-stage build:

```
Stage 1 (deps):    Install pnpm, install dependencies
Stage 2 (build):   Run vue-tsc + vite build, output static files
Stage 3 (runtime): Nginx, serve static files on port 80
```

Dockerfiles and dev overlay: [backend/Dockerfile](../backend/Dockerfile), [frontend/Dockerfile](../frontend/Dockerfile), [docker-compose.dev.yml](../docker-compose.dev.yml).

### 9.3 Development builds

The `docker-compose.dev.yml` overlay:

- Switches to `Dockerfile.dev` for both backend and frontend.
- **Backend**: Runs `tsx watch` for hot-reload on TypeScript changes.
- **Frontend**: Runs `vite dev` with HMR.
- Mounts source directories as volumes (changes on host are reflected instantly).
- Sets `NODE_OPTIONS=--preserve-symlinks` for pnpm workspace compatibility.
- Uses anonymous volumes for `node_modules` to avoid conflicts with host.

---

## 10. CI/CD Pipeline

The project uses **GitHub Actions** workflows for PR validation, deployment, and docs sync.

### 10.1 Development validation (`pr-dev.yml`)

Runs a matrix validation for frontend/backend/shared on pull requests targeting `feat/**`, `fix/**`, `enhancement/**`, and `test-feat/**` integration branches.

```
For each package in [frontend, backend, shared]:
  1. Checkout code
  2. Setup pnpm 10 + Node 24
  3. Install dependencies (frozen lockfile)
  4. Lint
  5. Test (skipped for shared)
  6. Build
```

### 10.2 Staging validation (`pr-staging.yml`)

Runs the same matrix validation on pull requests targeting `staging`, including coverage and Codecov upload for backend/frontend.

### 10.3 Production validation (`pr-main.yml`)

Runs matrix validation on pull requests targeting `main` and enforces merge policy (`main` only from `staging`; `test-main` only from `test-staging`).

### 10.4 Build & deploy (`build-and-publish-stag.yml`, `build-and-publish-main.yml`)

On push to `staging` or `main`:

1. **Build** frontend and backend Docker images and push them to GitHub Container Registry (GHCR). The CI build currently targets linux/amd64 platform images in the workflows.
2. **Push** images to GHCR (`:staging` / `:main` tags).
3. **Deploy** via SSH to the target host by running `docker compose pull` and `docker compose up -d --remove-orphans`.

### 10.5 Wiki sync (`sync-wiki.yaml`)

On push to `staging` with changes under `DOCS/**`, copies docs into the repository wiki.

CI workflow files: [pr-main.yml](../.github/workflows/pr-main.yml), [pr-dev.yml](../.github/workflows/pr-dev.yml), [pr-staging.yml](../.github/workflows/pr-staging.yml), [build-and-publish-stag.yml](../.github/workflows/build-and-publish-stag.yml), [build-and-publish-main.yml](../.github/workflows/build-and-publish-main.yml), [sync-wiki.yaml](../.github/workflows/sync-wiki.yaml).

---

## 11. Branching Strategy

```
main          ◄──── staging only (enforced by CI)
  │
staging       ◄──── feature / fix branches
  │
feat/*        ──── New features
fix/*         ──── Bug fixes
enhancement/* ──── Improvements to existing features
dependabot/*  ──── Automated dependency updates
```

- **Feature branches** are merged into `staging` via pull request.
- **Dependabot branches** are used for automated dependency updates and follow the same PR review/merge process.
- **`staging`** is the pre-production integration branch; it is the only branch allowed to merge into `main`.
- **`main`** represents the production deployment.
- The `pr-main.yml` workflow enforces the staging-only merge policy automatically.

---

## 12. Testing Strategy

### 12.1 Backend

- **Runner**: Vitest 4 (Node environment)
- **Coverage policy**: File-specific thresholds are enforced in `backend/vitest.config.ts` (strict defaults for core code, with scoped exceptions for selected legacy/scraper paths).

Coverage config: [backend/vitest.config.ts](../backend/vitest.config.ts).

### 12.2 Frontend

- **Runner**: Vitest 4 (jsdom environment)
- **Coverage policy**: Per-file threshold of 80% (statements, functions, branches, lines).

Coverage/test config: [frontend/vite.config.ts](../frontend/vite.config.ts).

### 12.3 Shared

The shared package has no tests of its own. Its schemas are validated indirectly through backend and frontend tests. CI skips the test step for this package.

---

## 13. Environment Variables

Defined in `.env` (copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PORT` | `5432` | PostgreSQL port |
| `BACKEND_PORT` | `3000` | Backend API port |
| `FRONTEND_PORT` | `5173` | Frontend dev server port |
| `DATABASE_URL` | `postgres://postgres@db:${DB_PORT}/postgres` | PostgreSQL connection string |
| `DEBUG` | `True` | Enables Fastify debug logging when set to `"true"` |
| `GARAGE_RPC_SECRET` | `rpc-secret` | Garage RPC secret |
| `GARAGE_ADMIN_TOKEN` | `admin-token` | Garage admin API token |
| `VIERNULVIER_API_TOKEN` | `<token>` | Token for upstream VIERNULVIER API integration |
| `JWT_SECRET` | *(required for backend auth)* | Secret for signing JWT tokens |

See environment example and scripts: [.env.example](../.env.example), [backend/package.json](../backend/package.json), and [backend/src/plugins/jwt.ts](../backend/src/plugins/jwt.ts).

---

*For database schema details, see [DATABASE.md](./DATABASE.md). For setup instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).*
