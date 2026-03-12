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

The monorepo contains three packages, each with its own `src/`, `test/`, `Dockerfile`, and configuration files:

- **`backend/`** — Fastify REST API. Source code is in `src/` (entry point, server setup, plugins, and domain-organized routes). SQL migrations live in `migrations/`, utility scripts in `scripts/`.
- **`frontend/`** — Vue 3 SPA. Source code in `src/`, UI mockups in `mock/`.
- **`shared/`** — Zod schemas and TypeScript types consumed by both backend and frontend. Contains no tests — validated indirectly through the other packages.

At the root level: Docker Compose files for production and development, pnpm workspace config, `.env.example`, CI/CD workflows in `.github/`, and helper shell scripts for starting dev containers and running migrations.

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

The shared package also provides helpers for foreign key relationships (lazy-evaluated to avoid circular dependencies), multilingual field validation (`languageMap`), and string-to-number codecs for route parameter parsing.

---

## 5. Backend

The backend is a **Fastify 5** REST API running on **Node.js 24**. It follows Fastify's plugin-based architecture.

### 5.1 Architecture

On startup the server registers three plugins in order — **postgres** (connection pool via `@fastify/postgres`), **jwt** (cookie-based JWT via `@fastify/jwt` + `@fastify/cookie`), and **authorize** (a `preHandler` hook for protected routes) — followed by the route modules.

Routes are organized by domain. Each domain has its own directory under `routes/` containing route definitions and a `handlers/` folder. The current modules are:

| Module | Prefix | Public endpoints | Protected endpoints |
|--------|--------|:----------------:|:-------------------:|
| **Production** | `/api/v1/production` | Fetch all/one | CRUD, bulk edit |
| **Auth** | `/api/v1/auth` | Login, logout | Admin CRUD |
| **Tags** | `/api/v1/tags` | Fetch public tags | Full CRUD, fetch all |
| **Tag Types** | `/api/v1/tags/type` | Fetch all/one | CRUD |
| **Halls** | `/api/v1/hall` | Fetch all/one | CRUD |

Every domain follows a consistent REST pattern: public GET endpoints for reading, and authenticated POST/PUT/PATCH/DELETE for writing. Most entities also expose a `/meta` variant that includes audit fields.

### 5.2 Helper functions

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

The frontend is a **Vue 3** single-page application (Composition API, `<script setup>`) built with **Vite 7** and TypeScript. It communicates with the backend through a Vite dev proxy (`/api` → backend container), which also handles cookie forwarding for authentication.

UI mockups and domain model documentation are in the `mock/` directory.

---

## 7. Database

The database is **PostgreSQL 18**, managed through **Postgrator** migrations stored in `backend/migrations/`. Migrations follow the `NNN.do.<name>.sql` / `NNN.undo.<name>.sql` convention and are run via `pnpm migrate` in the backend container.

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
│        │    Set-Cookie: session=<JWT>     │  3. Sign JWT { id, username }
│        │ ◀────────────────────────────── │         │
└────────┘                                 └─────────┘
```

The signed JWT (HS256, 24 h expiry) is stored in an `httpOnly` session cookie. Protected routes use the `server.authorize` preHandler hook which verifies the cookie and populates `request.user`.

Passwords are hashed with **bcrypt** (12 salt rounds). Failed login attempts use a dummy bcrypt comparison to prevent timing-based user enumeration. The `JWT_SECRET` is generated via `crypto.randomBytes(32)` and must never be committed.

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

- **Runner**: Vitest 4 (Node environment)
- **Coverage threshold**: **97.5%** per file (statements, functions, branches, lines)

Route tests use `buildServer()` to create a server instance, mock the `pg` decorator, and assert against injected HTTP requests. A global setup file configures `JWT_SECRET` for test JWT signing.

### 12.2 Frontend

- **Runner**: Vitest 4 (jsdom environment)
- **Coverage threshold**: **80%** per file
- **Utilities**: `@vue/test-utils` for component mounting and interaction

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

*For database schema details, see [DATABASE.md](./DATABASE.md). For setup instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).*
