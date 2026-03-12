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
console.log(`password hash: ${hash}`);

const res = await client.query(
  "INSERT INTO admin (username, password) VALUES ($1 , $2);",
  [`admin`, hash],
);
console.log(res);
await client.end();
