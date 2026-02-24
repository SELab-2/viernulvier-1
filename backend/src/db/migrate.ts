import pg from "pg";
import Postgrator from "postgrator";
import path from "node:path";
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
 */
export async function migrate() {
  const client = new pg.Client({
    connectionString: process.env["DATABASE_URL"],
  });
  await waitForDB();
  try {
    await client.connect();
    if (client.database === undefined) {
      throw Error("Database client wasn't properly instantiated.");
    }
    const postgrator = new Postgrator({
      migrationPattern: path.join(process.cwd(), "migrations/*"),
      driver: "pg",
      database: client.database,
      schemaTable: "migrations",
      currentSchema: "public",
      execQuery: (query) => client.query(query),
    });

    const result = await postgrator.migrate();

    if (result.length === 0) {
      console.log("No migrations needed");
    } else {
      console.log("Migrations applied:", result);
    }
  } finally {
    await client.end();
  }
}
