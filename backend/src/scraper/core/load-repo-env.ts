/**
 * Loads the monorepo root `.env` when running `pnpm run scrape` from `backend/`.
 * Matches Docker Compose `env_file: .env` at the repo root (not `backend/.env`).
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scraperDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scraperDir, "..", "..", "..", "..");
config({ path: path.join(repoRoot, ".env") });
