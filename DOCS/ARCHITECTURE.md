# Architecture Overview

This document describes the high-level architecture of the **viernulvier-archive** application. The codebase is organized as a pnpm-powered monorepo with three primary packages and shared artifacts.

## 📦 Repository Structure

- **backend/** – A TypeScript/Node.js REST API built on Fastify (or similar), responsible for serving archival content and handling data persistence in PostgreSQL. It exposes JSON endpoints consumed by the frontend and other clients.
- **frontend/** – A Vue 3 single‑page application built with Vite. It fetches data from the backend and renders the archived site. Static assets and client logic live here.
- **shared/** – Reusable code and TypeScript types used by both backend and frontend (e.g. domain models, utility functions, validation schemas).

Each package includes its own configuration (tsconfig, eslint, tests, Dockerfile, etc.) but they share common tooling via root-level `package.json`, `pnpm-workspace.yaml`, and linting rules.

## 🧩 Component Interaction

1. **Client requests** originate from the browser (frontend). The SPA makes HTTP requests to the backend API.
2. **Backend** retrieves or modifies data in the PostgreSQL database; migrations are managed using the `migrations/` scripts in the root.
3. Responses are sent back as JSON; frontend presents the content to users.
4. Shared types ensure consistency between both sides during development.

---

Refer to the other documentation files for deeper details on database structure and contributing guidelines.