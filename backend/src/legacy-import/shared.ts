import { config as loadDotenv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

/**
 * Load monorepo-root `.env` when this module loads (import it first from legacy import scripts).
 * `import "dotenv/config"` only reads `.env` from `process.cwd()`, so `cd backend && pnpm run import:*`
 * would miss `../.env` otherwise. Does not override env vars already set in the shell.
 */
const _legacyImportDir = path.dirname(fileURLToPath(import.meta.url));
const _repoRoot = path.resolve(_legacyImportDir, "..", "..", "..");
loadDotenv({ path: path.join(_repoRoot, ".env") });

/** Expand `${DB_PORT}` in a connection string (plain `dotenv` does not interpolate it). */
export function expandLegacyImportDatabaseUrlString(raw: string, dbPort: string): string {
  return raw.replace(/\$\{DB_PORT\}/g, dbPort);
}

/**
 * Docker Compose uses hostname `db` on the app network; on the host that name does not resolve.
 * When `runningInDocker` is false, rewrite host `db` → `127.0.0.1`.
 */
export function rewriteDockerDbHostInDatabaseUrl(
  urlStr: string,
  options: { runningInDocker: boolean },
): string {
  if (options.runningInDocker) return urlStr;
  try {
    const url = new URL(urlStr);
    if (url.hostname !== "db") return urlStr;
    url.hostname = "127.0.0.1";
    return url.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Mutates `env.DATABASE_URL` when it can be fully resolved and normalized for legacy import CLIs.
 * Skips updates if `${DB_PORT}` expansion still leaves other `${…}` placeholders (invalid for `pg`).
 */
export function resolveLegacyImportDatabaseUrl(
  env: NodeJS.ProcessEnv,
  options: { runningInDocker: boolean },
): void {
  let next = env["DATABASE_URL"];
  if (!next) return;
  const port = env["DB_PORT"] ?? "5432";
  if (next.includes("${DB_PORT}")) {
    next = expandLegacyImportDatabaseUrlString(next, port);
    if (next.includes("${")) return;
  }
  next = rewriteDockerDbHostInDatabaseUrl(next, {
    runningInDocker: options.runningInDocker,
  });
  env["DATABASE_URL"] = next;
}
resolveLegacyImportDatabaseUrl(process.env, {
  runningInDocker: fs.existsSync("/.dockerenv"),
});

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

export type LegacyImportCliOptions = {
  defaultFile: string;
  /** e.g. `import:productions` (shown in usage / scriptName). */
  scriptForUsage: string;
  /** One-line summary for `--help`. */
  description: string;
};

/**
 * After `hideBin(process.argv)`, argv[0] is still the executed script (`tsx` / `node` passes it).
 * `pnpm run … -- <args>` also inserts a standalone `--` before `<args>`; yargs then treats tokens
 * after that as positionals, so `--help` becomes a fake CSV path. Drop script + `--` sentinels.
 */
function argvForLegacyImportYargs(hideBinResult: readonly string[], fromTest: boolean): string[] {
  const afterScript =
    !fromTest && hideBinResult.length > 0 ? hideBinResult.slice(1) : [...hideBinResult];
  return afterScript.filter((token) => token !== "--");
}

/**
 * Shared yargs CLI for legacy CSV importers: positional path, `--file`, `--dry-run`, `--limit`, `--help` / `-h`.
 * `--file` overrides a positional path; if multiple positionals are given without `--file`, the last wins.
 *
 * @param argv - Optional argv slice for unit tests. When set, yargs does not call `process.exit` on errors or `--help`.
 */
export function parseLegacyImportCli(
  options: LegacyImportCliOptions,
  argv?: readonly string[],
): ImportArgs {
  const fromTest = argv !== undefined;
  const input = fromTest
    ? argvForLegacyImportYargs(argv, true)
    : argvForLegacyImportYargs(hideBin(process.argv), false);

  const parsed = yargs(input)
    .exitProcess(!fromTest)
    .scriptName(`pnpm run ${options.scriptForUsage}`)
    .usage(
      `${options.description}\n\nUsage:\n  pnpm run ${options.scriptForUsage} -- [path/to/file.csv] [options]\n  pnpm run ${options.scriptForUsage} -- --file <path> [options]\n\nDefault CSV:\n  ${options.defaultFile}`,
    )
    .option("file", {
      type: "string",
      requiresArg: true,
      describe: "CSV file path (--file overrides a positional path)",
    })
    .option("dry-run", {
      type: "boolean",
      default: false,
      describe: "Parse and validate only; no database writes",
    })
    .option("limit", {
      type: "number",
      requiresArg: true,
      describe: "Stop after reading n data rows from the CSV",
    })
    .check((argv) => {
      if (argv.file !== undefined && String(argv.file).trim() === "") {
        throw new Error("Missing value for --file");
      }
      if (argv.limit !== undefined) {
        const n = argv.limit;
        if (typeof n !== "number" || !Number.isInteger(n) || n < 1) {
          throw new Error("--limit must be a positive integer");
        }
      }
      return true;
    })
    .strictOptions()
    .help("help")
    .alias("h", "help")
    .version(false)
    .parseSync();

  const positionals = parsed._.map(String).filter((p) => p.length > 0 && p !== "--");
  const lastPositional = positionals.length > 0 ? positionals[positionals.length - 1] : undefined;

  const fileOpt = parsed.file;
  let filePath = options.defaultFile;
  if (fileOpt !== undefined && String(fileOpt).trim() !== "") {
    filePath = path.resolve(process.cwd(), String(fileOpt));
  } else if (lastPositional !== undefined) {
    filePath = path.resolve(process.cwd(), lastPositional);
  }

  const dryRun = parsed.dryRun === true;
  const limit = parsed.limit === undefined ? null : parsed.limit;

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
