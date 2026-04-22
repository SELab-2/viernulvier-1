import { hashPassword } from "../src/routes/auth/handlers/hash.js";
import pg from "pg";
import readline from "readline";

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

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

// Ask for credentials
const username = await ask("Enter superadmin username: ");
const password = await ask("Enter superadmin password: ");

if (!username || !password) {
  throw new Error("Username and password are required");
}

const hash = await hashPassword(password);

// Insert or update superadmin
await client.query(
  `INSERT INTO admin (username, password, super, created_at, updated_at)
   VALUES ($1, $2, TRUE, NOW(), NOW())
   ON CONFLICT (username) DO UPDATE
   SET password = EXCLUDED.password,
       super = TRUE,
       updated_at = NOW();`,
  [username, hash],
);

// Self-reference created_by / updated_by
await client.query(
  `UPDATE admin
   SET created_by = id,
       updated_by = id
   WHERE username = $1;`,
  [username],
);

const { rows } = await client.query(
  `SELECT * FROM admin ORDER BY id;`,
);
console.table(rows);

await client.end();
