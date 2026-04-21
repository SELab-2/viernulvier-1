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

const DEFAULT_PRODUCTIONS_FILE = resolveDefaultLegacyImportFile(import.meta.url, [
  "data",
  "imports",
  "productions.csv",
]);

async function main() {
  const args = parseLegacyImportCli({
    defaultFile: DEFAULT_FILE,
    scriptForUsage: "import:events",
    description: "Import legacy events CSV into Postgres.",
    eventsProductionsDefault: DEFAULT_PRODUCTIONS_FILE,
  });

  assertDatabaseUrl();
  assertCsvFileExists(args.filePath);
  if (args.productionsFilePath === undefined) {
    throw new Error("Internal error: missing productionsFilePath (events CLI must set eventsProductionsDefault).");
  }
  assertCsvFileExists(args.productionsFilePath);

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
