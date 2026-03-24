import {
  assertCsvFileExists,
  assertDatabaseUrl,
  parseLegacyImportCli,
  resolveDefaultLegacyImportFile,
} from "@/legacy-import/shared.js";
import pg from "pg";
import { importEventsLegacy } from "@/legacy-import/import-events-legacy.js";

const DEFAULT_FILE = resolveDefaultLegacyImportFile(import.meta.url, [
  "data",
  "imports",
  "events.csv",
]);

async function main() {
  const args = parseLegacyImportCli({
    defaultFile: DEFAULT_FILE,
    scriptForUsage: "import:events",
    description: "Import legacy events CSV into Postgres.",
  });

  assertDatabaseUrl();
  assertCsvFileExists(args.filePath);

  const client = new pg.Client({ connectionString: process.env["DATABASE_URL"] });
  await client.connect();
  try {
    await importEventsLegacy(client, args);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
