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

// Insert superadmin first (super: true), self-referencing created_by/updated_by
await client.query(
  `INSERT INTO admin (username, password, super, created_at, updated_at)
   VALUES ($1, $2, TRUE, NOW(), NOW())
   ON CONFLICT (username) DO UPDATE
   SET password = EXCLUDED.password,
       super = EXCLUDED.super,
       updated_at = NOW();`,
  ["superadmin", hash],
);

const { rows: superadminRows } = await client.query(
  `UPDATE admin SET created_by = id, updated_by = id WHERE username = $1 RETURNING id;`,
  ["superadmin"],
);
const superadminId = superadminRows[0].id;

// Insert admin (super: false), attributed to superadmin
await client.query(
  `INSERT INTO admin (username, password, super, created_at, updated_at, created_by, updated_by)
   VALUES ($1, $2, FALSE, NOW(), NOW(), $3, $3)
   ON CONFLICT (username) DO UPDATE
   SET password = EXCLUDED.password,
       super = EXCLUDED.super,
       created_by = EXCLUDED.created_by,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW();`,
  ["admin", hash, superadminId],
);

const { rows } = await client.query(
  `SELECT * FROM admin ORDER BY id;`,
);
console.table(rows);

await client.end();
