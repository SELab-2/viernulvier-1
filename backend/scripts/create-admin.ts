import { hashPassword } from "../src/routes/auth/handlers/hash.js";
import pg from "pg";

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

const client = new pg.Client({
  connectionString: process.env["DATABASE_URL"],
});
await waitForDB();
await client.connect();

const hash = await hashPassword(`password`);

await client.query(
  `INSERT INTO admin (username, password, created_at, updated_at)
   VALUES ($1, $2, NOW(), NOW())
   ON CONFLICT (username) DO UPDATE
   SET password = EXCLUDED.password,
       updated_at = NOW();`,
  ["admin", hash],
);

await client.query(
  `UPDATE admin SET created_by = id, updated_by = id WHERE username = $1;`,
  ["admin"],
);

const { rows } = await client.query(
  `SELECT * FROM admin WHERE username = $1;`,
  ["admin"],
);
console.table(rows);

await client.end();
