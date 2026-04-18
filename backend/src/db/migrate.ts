import pg from "pg";
import Postgrator from "postgrator";
import path from "node:path";
import fs from "node:fs";

/**
 *
 * @returns a {@link Promise} that resolves once the DB connection is established and healthy.
 */
async function waitForDB() {
  for (let i = 0; i < 10; i++) {
    const client = new pg.Client({
      connectionString: process.env["DATABASE_URL"],
    });

    try {
      await client.connect();
      await client.end();
      return;
    } catch {
      console.log("Waiting for DB...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  throw new Error("Database not ready");
}

/**
 * Function used to apply all missing migrations found in ./migrations.
 * @see ./scripts/migrate.ts for how this is used.
 * @param target - The target migration version to migrate to.
 * @param migrationsPath - Optional path to the migrations folder. Defaults to [cwd]/migrations.
 */
export async function migrate(
  target: string | undefined = undefined,
  migrationsPath: string | undefined = undefined,
) {
  const client = new pg.Client({
    connectionString: process.env["DATABASE_URL"],
  });

  const resolvedMigrationsPath = migrationsPath ?? path.join(process.cwd(), "migrations");

  console.log(`Looking for migrations in: ${resolvedMigrationsPath}`);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const files = fs.readdirSync(resolvedMigrationsPath);
  console.log("Migrations found:", files);

  await waitForDB();
  try {
    await client.connect();
    if (client.database === undefined) {
      throw Error("Database client wasn't properly instantiated.");
    }
    const postgrator = new Postgrator({
      migrationPattern: path.join(resolvedMigrationsPath, "*"),
      driver: "pg",
      database: client.database,
      schemaTable: "migrations",
      currentSchema: "public",
      execQuery: (query) => client.query(query),
    });

    const result = await postgrator.migrate(target);

    if (result.length === 0) {
      console.log("No migrations needed");
    } else {
      console.log("Migrations applied:", result);
    }
  } finally {
    await client.end();
  }
}