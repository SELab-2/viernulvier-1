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
14. [Key Design Patterns](#14-key-design-patterns)

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

```
viernulvier-archive/
├── backend/                  # Fastify REST API
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── server.ts         # Fastify creation & plugin registration
│   │   ├── db/
│   │   │   └── migrate.ts    # Postgrator migration runner
│   │   ├── plugins/
│   │   │   ├── postgres.ts   # @fastify/postgres connection pool
│   │   │   ├── jwt.ts        # @fastify/jwt + @fastify/cookie
│   │   │   └── authorize.ts  # preHandler authentication hook
│   │   └── routes/
│   │       ├── registerRoutes.ts
│   │       ├── helpers.ts        # buildQuery, parseParams, replyHandler, HttpError
│   │       ├── production/
│   │       │   ├── production.ts # Route definitions
│   │       │   └── handlers/     # fetch, create, replace, edit, bulk-edit, delete
│   │       ├── auth/
│   │       │   ├── auth.ts       # Route definitions
│   │       │   └── handlers/     # login, logout, fetch, create, replace, edit, delete, hash
│   │       ├── tag/
│   │       │   ├── tags.ts       # Route definitions
│   │       │   └── handlers/     # fetch, create, replace, edit, delete
│   │       ├── tag_type/
│   │       │   ├── tag_types.ts  # Route definitions
│   │       │   └── handlers/     # fetch, create, replace, edit, delete
│   │       └── hall/
│   │           ├── hall.ts       # Route definitions
│   │           └── handlers/     # fetch, create, replace, edit, delete
│   ├── migrations/           # Numbered SQL migration files (001–007)
│   ├── scripts/              # migrate.ts, create-admin.ts, generate-secret.ts
│   ├── test/                 # Vitest tests
│   ├── Dockerfile            # Production multi-stage build
│   └── Dockerfile.dev        # Development with tsx hot-reload
│
├── frontend/                 # Vue 3 SPA
│   ├── src/
│   │   ├── main.ts           # App bootstrap
│   │   ├── App.vue           # Root component
│   │   ├── style.css         # Global styles
│   │   ├── components/       # Reusable Vue components
│   │   └── assets/           # Static images
│   ├── mock/                 # UI mockups & domain model docs
│   ├── test/                 # Vitest + jsdom tests
│   ├── Dockerfile            # Production build → Nginx
│   └── Dockerfile.dev        # Development with Vite HMR
│
├── shared/                   # Shared types & validation schemas
│   ├── src/
│   │   ├── index.ts          # Re-exports from types/
│   │   └── types/
│   │       ├── index.ts      # Barrel export
│   │       ├── helpers.ts    # ForeignKey, primaryKey, serial, languageMap, codecs
│   │       ├── metadata.ts   # createSchema, withMeta, MetadataShape
│   │       ├── admin.ts
│   │       ├── production.ts
│   │       ├── event.ts
│   │       ├── hall.ts
│   │       ├── tag.ts
│   │       ├── blog.ts
│   │       ├── image.ts
│   │       └── crop.ts
│   └── package.json          # Exports raw .ts source for direct consumption
│
├── DOCS/                     # Project documentation
│   ├── ARCHITECTURE.md       # ← You are here
│   ├── CONTRIBUTING.md       # Setup, workflow, common problems
│   └── DATABASE.md           # Full DBML schema & design rationale
│
├── .github/
│   ├── workflows/            # CI/CD pipelines (4 workflow files)
│   ├── CODEOWNERS
│   └── pull_request_template.md
│
├── docker-compose.yml        # Production orchestration
├── docker-compose.dev.yml    # Development overrides (hot-reload, volume mounts)
├── pnpm-workspace.yaml       # Workspace & dependency override definitions
├── .npmrc                    # pnpm config (hoisted node-linker)
├── .env.example              # Required environment variables
├── rundev.sh / rundev.bat    # Development startup scripts
├── migrate-db.sh             # Database migration helper
└── create-admin.sh           # Seed a test admin user
```

---

## 3. Monorepo Tooling

| Tool | Purpose |
|------|---------|
| **pnpm** (workspaces) | Package manager with workspace support. The three packages (`backend`, `frontend`, `shared`) are linked automatically. |
| **TypeScript 5.9** | Strict mode across all packages. The shared package's `tsconfig.json` extends the backend's to keep compiler options consistent. |
| **ESLint 9** | Flat config with `@typescript-eslint`, `eslint-plugin-security` (backend), `eslint-plugin-vue` (frontend), and `eslint-plugin-tsdoc` (both). |
| **Vitest 4** | Test runner for both backend (Node environment) and frontend (jsdom environment). |

### Workspace dependency graph

```
backend ──depends on──▶ @viernulvier/shared
frontend ─depends on──▶ @viernulvier/shared
```

The shared package exposes **raw TypeScript source** (not compiled output) via its `exports` map. This means consumers (backend via `tsx`, frontend via Vite) transpile it on-the-fly. This avoids a separate build step during development.

### Root scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Starts all Docker containers with hot-reload |
| `pnpm check-all` | Installs, lints, tests, and builds all three packages |
| `pnpm lint-all` / `lint:fix-all` | Runs ESLint across the monorepo |
| `pnpm coverage-all` | Runs tests with code coverage for backend + frontend |
| `pnpm build-all` | Full production build of all packages |
| `pnpm generate-secret` | Generates a random JWT secret |

---

## 4. Shared Package (`@viernulvier/shared`)

The shared package is the single source of truth for domain types and validation rules. It uses [Zod 4](https://zod.dev) to define schemas that serve as both **runtime validators** and **TypeScript type generators**.

### 4.1 Domain entities

| Entity | Description |
|--------|-------------|
| **Admin** | CMS administrator account (username, profile picture) |
| **Production** | A cultural work — theatre show, concert, film, etc. Contains multilingual text fields |
| **Event** | A specific scheduled occurrence of a production at a hall |
| **EventPrice** | Pricing information for an event (amount, availability, expiration) |
| **Hall** | A physical venue where events take place |
| **Tag** / **TagType** | Classification system. Tags belong to typed categories (genre, festival, etc.) |
| **Image** / **Crop** | Media assets. An image belongs to a production; crops are derived variants with URLs |
| **Blog** / **BlogPost** | Optional editorial content linked to productions |
| **CustomProductionFieldDefinition** / **CustomProductionField** | EAV (entity-attribute-value) system for dynamic per-production fields |

### 4.2 The `createSchema` / `withMeta` pattern

Every domain schema is created through `createSchema()` instead of `z.object()` directly. This factory attaches a non-enumerable `withMeta()` method to the schema:

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

This pattern gives every entity two shapes: a **base** form (for creation/editing) and a **withMeta** form (for reading from the database, which includes audit fields).

### 4.3 Foreign key system

The `ForeignKey<O, T>` class extends `z.ZodType` with a `.references` property that returns the target schema. Foreign keys use lazy evaluation (`z.lazy(...)`) to support circular references between entities:

```typescript
// In event.ts — references ProductionSchema and HallSchema
get production(): ForeignKey<typeof ProductionSchema> {
  return foreignKey(() => ProductionSchema);
},
get hall(): ForeignKey<typeof HallSchema> {
  return foreignKey(() => HallSchema);
},
```

At the Zod validation level a foreign key is a branded non-negative integer. The `.references` property is used for type-level traversal, not runtime validation.

### 4.4 Multilingual fields

Text content is stored as a JSON object with language keys. The `languageMap` schema validates this:

```typescript
const VALID_LANGUAGES = z.enum(["nl", "en", "fr"]);
const languageMap = z.partialRecord(VALID_LANGUAGES, z.string())
  .refine((map) => Object.keys(map).length >= 1);

// Valid: { nl: "Hallo", en: "Hello" }
// Invalid: {} (at least one language required)
```

### 4.5 Codecs

String-to-number codecs (`stringToSerial`, `stringToInt`) handle the conversion between URL parameters (always strings) and typed integers. They are used in the backend for route parameter parsing.

---

## 5. Backend

The backend is a **Fastify 5** REST API running on **Node.js 24**. It follows Fastify's plugin-based architecture.

### 5.1 Server bootstrap

```
index.ts
  └─▶ start()                          [server.ts]
       ├─▶ createServer()              Create Fastify instance (optional debug logging)
       └─▶ registerPlugins()           Register in strict order:
            ├─▶ dbPlugin               @fastify/postgres (connection pool, max 30)
            ├─▶ jwtPlugin              @fastify/cookie + @fastify/jwt
            ├─▶ authorizePlugin        Decorates server with authorize hook
            └─▶ registerRoutes()       Mounts all route modules
```

The `buildServer()` export creates a fully configured server without listening — used in tests.

### 5.2 Plugin system

| Plugin | File | Responsibility |
|--------|------|----------------|
| **postgres** | `plugins/postgres.ts` | Registers `@fastify/postgres` with pooled connections. Decorates `server.pg` for raw SQL queries. |
| **jwt** | `plugins/jwt.ts` | Registers `@fastify/cookie` and `@fastify/jwt`. Configures JWT signing with `JWT_SECRET`. Session tokens are stored in an `httpOnly`, `sameSite: strict` cookie named `session`. |
| **authorize** | `plugins/authorize.ts` | Decorates the server with an `authorize` hook that verifies the JWT. Used as a `preHandler` on protected routes. Returns 401 if the token is missing or invalid. |

### 5.3 Route architecture

Routes are organized by domain. Each route module is a Fastify plugin registered under a URL prefix. The five modules are registered in `registerRoutes.ts`:

#### Production (`/api/v1/production`)

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/v1/production` | | Fetch all productions (with tags and events) |
| GET | `/api/v1/production/:id` | | Fetch single production (with tags and events) |
| GET | `/api/v1/production/:id/meta` | 🔒 | Fetch production with metadata |
| POST | `/api/v1/production` | 🔒 | Create production |
| PUT | `/api/v1/production/:id` | 🔒 | Replace production |
| PATCH | `/api/v1/production/:id` | 🔒 | Partial update production |
| PATCH | `/api/v1/production/bulk` | 🔒 | Bulk update multiple productions |
| DELETE | `/api/v1/production/:id` | 🔒 | Delete production |

#### Auth (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/api/v1/auth/login` | | Login (returns session cookie) |
| POST | `/api/v1/auth/logout` | | Logout (clears session cookie) |
| GET | `/api/v1/auth/:id` | 🔒 | Fetch admin |
| GET | `/api/v1/auth/:id/meta` | 🔒 | Fetch admin with metadata |
| POST | `/api/v1/auth` | 🔒 | Create admin |
| PUT | `/api/v1/auth/:id` | 🔒 | Replace admin |
| PATCH | `/api/v1/auth/:id` | 🔒 | Partial update admin |
| DELETE | `/api/v1/auth/:id` | 🔒 | Delete admin |

#### Tags (`/api/v1/tags`)

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/v1/tags` | | Fetch public tags (optionally filtered by `?production=<id>`) |
| GET | `/api/v1/tags/all` | 🔒 | Fetch all tags including non-public |
| GET | `/api/v1/tags/:id` | | Fetch single public tag |
| GET | `/api/v1/tags/:id/all` | 🔒 | Fetch single tag (including non-public) |
| GET | `/api/v1/tags/:id/meta` | 🔒 | Fetch tag with metadata |
| POST | `/api/v1/tags` | 🔒 | Create tag |
| PUT | `/api/v1/tags/:id` | 🔒 | Replace tag |
| PATCH | `/api/v1/tags/:id` | 🔒 | Partial update tag |
| DELETE | `/api/v1/tags/:id` | 🔒 | Delete tag |

#### Tag Types (`/api/v1/tags/type`)

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/v1/tags/type` | | Fetch all tag types |
| GET | `/api/v1/tags/type/:id` | | Fetch single tag type |
| GET | `/api/v1/tags/type/:id/meta` | 🔒 | Fetch tag type with metadata |
| POST | `/api/v1/tags/type` | 🔒 | Create tag type |
| PUT | `/api/v1/tags/type/:id` | 🔒 | Replace tag type |
| PATCH | `/api/v1/tags/type/:id` | 🔒 | Partial update tag type |
| DELETE | `/api/v1/tags/type/:id` | 🔒 | Delete tag type |

#### Halls (`/api/v1/hall`)

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/v1/hall` | | Fetch all halls |
| GET | `/api/v1/hall/:id` | | Fetch single hall |
| GET | `/api/v1/hall/:id/meta` | 🔒 | Fetch hall with metadata |
| POST | `/api/v1/hall` | 🔒 | Create hall |
| PUT | `/api/v1/hall/:id` | 🔒 | Replace hall |
| PATCH | `/api/v1/hall/:id` | 🔒 | Partial update hall |
| DELETE | `/api/v1/hall/:id` | 🔒 | Delete hall |

🔒 = requires authentication (uses `server.authorize` preHandler)

### 5.4 Request lifecycle

Every route handler follows a standard pipeline:

```
1. preHandler  →  authorize hook (if protected) → verify JWT cookie
2. parseParams →  validate URL params against a Zod schema
3. parseSchema →  validate request body (if applicable)
4. buildQuery  →  type-safe SQL query with validated input/output
5. replyHandler → catch HttpError, send 404 for null results, 200 for success
```

### 5.5 Helper functions

The `routes/helpers.ts` module provides the core request-handling utilities:

| Function | Purpose |
|----------|---------|
| `parseParams(request, schema)` | Validates URL parameters against a Zod object schema. Throws 400 on failure. |
| `parseSchema(server, schema, value, context)` | General-purpose Zod validation. Context determines error code (400 for request, 500 for database). |
| `buildQuery(server, sql, [filterFields], resultSchema)` | Returns a reusable, type-safe query function. Validates input parameters, executes parameterized SQL, validates output rows. |
| `replyHandler(server, handler)` | Wraps async handlers. Converts `HttpError` to proper HTTP responses, returns 404 for null results. |
| `getMetadata(request)` | Extracts the authenticated admin's ID from the JWT payload. Used for audit trail fields. |
| `HttpError` | Custom error class with an HTTP status code. Thrown inside handlers, caught by `replyHandler`. |

### 5.6 Password handling

Passwords are hashed with **bcrypt** (12 salt rounds). The login handler uses a constant-time dummy comparison on failed lookups to prevent timing-based user enumeration.

---

## 6. Frontend

The frontend is a **Vue 3** single-page application built with **Vite 7** and TypeScript.

### 6.1 Current state

The frontend is currently in a **starter template** state with the core tooling configured and ready for feature development. The infrastructure is production-grade:

| Concern | Solution |
|---------|----------|
| Framework | Vue 3 with `<script setup>` Composition API |
| Build tool | Vite 7 with `@vitejs/plugin-vue` |
| Language | TypeScript (strict mode) |
| Testing | Vitest + Vue Test Utils (jsdom environment) |
| Linting | ESLint 9 + Prettier + Vue recommended rules |
| API access | Vite dev proxy: `/api/*` → `http://backend:3000` |
| Shared types | `@viernulvier/shared` consumed directly as TypeScript source |

### 6.2 Vite configuration

- **Dev server** listens on `0.0.0.0` (accessible from Docker host) on port `FRONTEND_PORT` (default 5173).
- **API proxy** forwards all `/api` requests to the backend container, enabling cookie-based auth without CORS issues.
- **Filesystem access** is set to allow `..` so Vite can resolve the shared package.
- **Path alias**: `@` resolves to `./src/`.

### 6.3 Planned features (per mockups)

The `mock/` directory contains UI specifications and a domain model:

- **Homepage** — Archive introduction with statistics
- **Archive overview** — Searchable, filterable, sortable production card grid
- **Production detail** — Full production info with events and series
- **Series/tag pages** — Filtered archive views
- **Admin interface** — Spreadsheet-style bulk editing for productions, events, tags

---

## 7. Database

The database is **PostgreSQL 18**, managed through **Postgrator** migrations stored in `backend/migrations/`.

### 7.1 Migration system

Migrations follow the naming convention `NNN.do.<name>.sql` (up) and `NNN.undo.<name>.sql` (down). They are run via `pnpm migrate` in the backend container.

| # | Migration | Creates |
|---|-----------|---------|
| 001 | `init` | `admin`, `production`, metadata fields |
| 002 | `create-hall-table` | `hall` |
| 003 | `create-event-tables` | `event`, `event_price` |
| 004 | `create-tag-tables` | `tag_type`, `tag`, `production_tag` |
| 005 | `create-image-tables` | `image`, `crop` |
| 006 | `create-blog-tables` | `blog`, `blogpost` |
| 007 | `create-production-custom-field-logic-tables` | `custom_production_field_definition`, `production_custom_field` |

### 7.2 Metadata pattern

Every domain table inherits four audit columns via PostgreSQL table inheritance:

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | `TIMESTAMPTZ` | Auto-set to `NOW()` on insert |
| `updated_at` | `TIMESTAMPTZ` | Auto-set to `NOW()` on insert |
| `created_by` | `INT` | FK → `admin(id)`, `ON DELETE SET NULL` |
| `updated_by` | `INT` | FK → `admin(id)`, `ON DELETE SET NULL` |

This is mirrored in the shared package's `MetadataShape` and the `withMeta()` method on every schema.

### 7.3 Key design decisions

- **Multilingual content** is stored as `JSONB` (`{ "nl": "...", "en": "...", "fr": "..." }`), validated by the `languageMap` Zod schema.
- **Deduplication** uses `vendor_id` fields (integers from the external VIERNULVIER API) to prevent importing the same production/event/hall twice.
- **Custom fields** use an EAV (entity-attribute-value) pattern with a type-discriminated value column. A `CHECK` constraint ensures only the column matching the field's type is non-null.
- **Images and crops** are separate entities. An `image` belongs to a production; a `crop` is a derived version with a URL and type label.

See [DATABASE.md](./DATABASE.md) for the full DBML schema and detailed design rationale.

---

## 8. Authentication & Authorization

### 8.1 Flow

```
┌────────┐    POST /api/v1/auth/login     ┌─────────┐
│ Client │ ──────────────────────────────▶ │ Backend │
│        │    { username, password }        │         │
│        │                                 │  1. Query admin by username
│        │                                 │  2. bcrypt.compare(password, hash)
│        │    Set-Cookie: session=<JWT>     │  3. Sign JWT { id, username }
│        │ ◀────────────────────────────── │         │
└────────┘                                 └─────────┘
```

### 8.2 Token details

| Property | Value |
|----------|-------|
| Algorithm | Default Fastify JWT (HS256) |
| Expiration | 24 hours |
| Payload | `{ id: number, username: string }` |
| Storage | `httpOnly` cookie named `session` |
| Cookie flags | `sameSite: strict`, `secure: true` (production only), `path: /` |

### 8.3 Protected routes

Protected routes use `{ preHandler: server.authorize }`. The `authorize` hook calls `request.jwtVerify()`, which reads the `session` cookie, verifies the signature, and populates `request.user` with the JWT payload.

### 8.4 Security considerations

- Passwords require 8–72 characters (72 is bcrypt's maximum input length).
- Failed login attempts use a **dummy bcrypt comparison** to prevent timing-based user enumeration.
- The `JWT_SECRET` is generated via `crypto.randomBytes(32)` and stored in the `.env` file (never committed).

---

## 9. Docker & Containerization

### 9.1 Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `db` | `postgres:18` | `DB_PORT` (5432) | Database with persistent named volume |
| `backend` | Custom (Node.js 24) | `BACKEND_PORT` (3000) | REST API |
| `frontend` | Custom (Nginx / Vite) | `FRONTEND_PORT` (5173) | SPA serving |

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

The project uses **GitHub Actions** with four workflow files.

### 10.1 Feature branch validation (`pr-dev.yml`)

Triggers on PRs to `feat/**`, `fix/**`, `enhancement/**`, and `test-feat/**` branches. Runs a **matrix build** across all three packages:

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

Same matrix build, triggered on PRs to `staging`.

### 10.3 Production validation (`pr-main.yml`)

Same matrix build plus an **enforce-policy** job that verifies the PR source branch is `staging` (prevents direct merges to `main`).

### 10.4 Build & deploy (`build-and-publish.yml`)

Triggered on push to `staging` or `main`:

1. **Build** frontend and backend Docker images on a self-hosted ARM64 runner.
2. **Push** images to GitHub Container Registry (GHCR) tagged with branch name + commit SHA.
3. **Deploy** via SSH to `viernulvier-archive.be`:
   ```
   docker compose pull && docker compose up -d --remove-orphans
   ```

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
```

- **Feature branches** are merged into `staging` via pull request.
- **`staging`** is the pre-production integration branch; it is the only branch allowed to merge into `main`.
- **`main`** represents the production deployment.
- The `pr-main.yml` workflow enforces the staging-only merge policy automatically.

---

## 12. Testing Strategy

### 12.1 Backend

| Property | Value |
|----------|-------|
| Runner | Vitest 4 (Node environment) |
| Coverage provider | V8 |
| Coverage threshold | **97.5%** per file (statements, functions, branches, lines) |
| Setup | `test/setup.ts` — sets `JWT_SECRET` for test JWT signing |
| Pattern | Mock the `server.pg.query` function, use `server.inject()` for HTTP assertions |

Tests mock the PostgreSQL plugin to avoid a real database connection. Each test file creates a server via `buildServer()`, overrides the `pg` decorator, and injects HTTP requests.

### 12.2 Frontend

| Property | Value |
|----------|-------|
| Runner | Vitest 4 (jsdom environment) |
| Coverage provider | V8 |
| Coverage threshold | **80%** per file |
| Utilities | `@vue/test-utils` for component mounting and interaction |

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
| `DATABASE_URL` | `postgres://postgres@db:5432/postgres` | PostgreSQL connection string |
| `DEBUG` | `True` | Enables Fastify debug logging when set to `"true"` |
| `JWT_SECRET` | *(required)* | Secret for signing JWT tokens. Generate with `pnpm generate-secret`. |

---

## 14. Key Design Patterns

### Type-safe full-stack contracts

Zod schemas in `@viernulvier/shared` are the single source of truth. The backend validates database output against them; the frontend will use the inferred TypeScript types for API response typing. A schema change in one place propagates to both sides at compile time.

### `buildQuery` — validated SQL pipeline

Every database query passes through `buildQuery()`, which validates both the input parameters and the output rows against Zod schemas. This provides two layers of defense: SQL injection is prevented by parameterized queries, and data integrity is enforced by runtime schema validation.

```typescript
const fetchAdmin = buildQuery(
  server,
  "SELECT id, username, profile_picture FROM admin WHERE id = $1",
  z.tuple([z.int()]),         // input: one integer parameter
  AdminSchema,                // output: each row must match AdminSchema
);

const [admin] = await fetchAdmin(42);
// admin is fully typed as Admin
```

### `replyHandler` — centralized error handling

Route handlers are wrapped in `replyHandler()`, which catches `HttpError` instances and converts them to proper HTTP responses. This keeps route logic focused on the happy path.

### Plugin decoration

Fastify's plugin system is used to decorate the server and request objects with capabilities (database client, JWT verification, authorization hook). This makes dependencies explicit and testable — tests can override decorators with mocks.

### Lazy foreign keys

The shared package uses getter-based lazy evaluation to define foreign key relationships between schemas. This allows schemas to reference each other without creating JavaScript circular dependency issues at module initialization time.

### EAV for extensibility

Custom production fields use an entity-attribute-value pattern. An admin defines field definitions (name + type), and each production can have values for any subset of definitions. A `CHECK` constraint ensures only the value column matching the field's type is non-null (`value_bool`, `value_number`, `value_string`, or `value_json`).

---

*For database schema details, see [DATABASE.md](./DATABASE.md). For setup instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).*
