import {
  assertCsvFileExists,
  assertDatabaseUrl,
  parseLegacyImportCli,
  resolveDefaultLegacyImportFile,
} from "@/legacy-import/shared.js";
import pg from "pg";
import { importProductionsLegacy } from "@/legacy-import/import-productions-legacy.js";

const DEFAULT_FILE = resolveDefaultLegacyImportFile(import.meta.url, [
  "data",
  "imports",
  "productions.csv",
]);

async function main() {
  const args = parseLegacyImportCli({
    defaultFile: DEFAULT_FILE,
    scriptForUsage: "import:productions",
    description: "Import legacy productions CSV into Postgres.",
  });

  assertDatabaseUrl();
  assertCsvFileExists(args.filePath);

  const client = new pg.Client({ connectionString: process.env["DATABASE_URL"] });
  await client.connect();
  try {
    await importProductionsLegacy(client, args);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
