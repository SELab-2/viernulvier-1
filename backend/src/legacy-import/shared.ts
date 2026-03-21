import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Log progress every N CSV rows (shared by legacy import CLIs). */
export const LEGACY_IMPORT_PROGRESS_EVERY = 500;

export type CsvRecord = Record<string, string | undefined>;

export type ImportArgs = {
  filePath: string;
  dryRun: boolean;
  limit: number | null;
};

/**
 * Resolves monorepo root from a script file URL under `backend/scripts/`.
 */
export function getRepoRootFromImportMeta(importMetaUrl: string): string {
  const scriptDir = path.dirname(fileURLToPath(importMetaUrl));
  const backendDir = path.resolve(scriptDir, "..");
  return path.resolve(backendDir, "..");
}

/**
 * Default CSV path relative to repo root, e.g. `["data", "imports", "productions.csv"]`.
 */
export function resolveDefaultLegacyImportFile(
  importMetaUrl: string,
  segments: string[],
): string {
  return path.join(getRepoRootFromImportMeta(importMetaUrl), ...segments);
}

export function assertDatabaseUrl(): void {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is not set");
  }
}

export function assertCsvFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
}

export type ParseImportArgsResult = ImportArgs | "help";

/**
 * Shared CLI for legacy CSV importers: positional path, `--file`, `--dry-run`, `--limit`, `--help` / `-h`.
 */
export function parseImportArgs(
  argv: string[],
  options: { defaultFile: string },
): ParseImportArgsResult {
  let filePath = options.defaultFile;
  let dryRun = false;
  let limit: number | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg || arg === "--") continue;

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      return "help";
    }

    if (!arg.startsWith("--")) {
      filePath = path.resolve(process.cwd(), arg);
      continue;
    }

    if (arg === "--file") {
      const value = argv[i + 1];
      if (!value) throw new Error("Missing value for --file");
      filePath = path.resolve(process.cwd(), value);
      i++;
      continue;
    }

    if (arg === "--limit") {
      const value = argv[i + 1];
      if (!value) throw new Error("Missing value for --limit");
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error("--limit must be a positive integer");
      }
      limit = parsed;
      i++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { filePath, dryRun, limit };
}

export function toLanguageMap(value: string): Record<"nl", string> {
  return { nl: value };
}

export function cleanValue(value: string | undefined): string {
  if (!value) return "";
  const normalized = value.replace(/\r\n/g, "\n").trim();
  const lowered = normalized.toLowerCase();
  if (lowered === "\\n" || lowered === "null" || lowered === "\\null") {
    return "";
  }
  return normalized;
}

export function normalizeRow(raw: CsvRecord): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key.trim().toLowerCase()] = cleanValue(value);
  }
  return normalized;
}

/** Options aligned with both legacy import scripts’ `csv-parse` usage. */
export const legacyCsvParseOptions = {
  columns: true,
  bom: true,
  relax_quotes: true,
  skip_empty_lines: true,
  trim: false,
} as const;
