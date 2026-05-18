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

// Check if blog with id = 1 already exists
const { rows: existing } = await client.query(
  `SELECT * FROM blog WHERE id = 1;`,
);

if (existing.length > 0) {
  console.log("Blog with id = 1 already exists:");
  console.table(existing.map((row) => ({ ...row, name: JSON.stringify(row.name) })));

  const overwrite = await ask("Do you want to overwrite it? (yes/no): ");
  if (overwrite.toLowerCase() !== "yes" && overwrite.toLowerCase() !== "y") {
    console.log("Aborted. No changes made.");
    await client.end();
    process.exit(0);
  }
}

// Ask for names in each language (defaults to "default")
const nameNlInput = await ask('Enter blog name (nl) [default: "default"]: ');
const nameEnInput = await ask('Enter blog name (en) [default: "default"]: ');
const nameFrInput = await ask('Enter blog name (fr) [default: "default"]: ');

const nameNl = nameNlInput || "default";
const nameEn = nameEnInput || "default";
const nameFr = nameFrInput || "default";

const name = { nl: nameNl, en: nameEn, fr: nameFr };

// Find the earliest-created admin for metadata
const { rows: admins } = await client.query(
  `SELECT id FROM admin ORDER BY created_at ASC LIMIT 1;`,
);

if (admins.length === 0) {
  throw new Error("No admin found. Please create a superadmin first.");
}

const adminId = admins[0].id;

// Insert or overwrite blog with id = 1
await client.query(
  `INSERT INTO blog (id, name, description, created_at, updated_at, created_by, updated_by)
   VALUES (1, $1, NULL, NOW(), NOW(), $2, $2)
   ON CONFLICT (id) DO UPDATE
   SET name = EXCLUDED.name,
       description = NULL,
       updated_at = NOW(),
       updated_by = EXCLUDED.updated_by;`,
  [JSON.stringify(name), adminId],
);

const { rows } = await client.query(`SELECT * FROM blog ORDER BY id;`);
console.table(rows.map((row) => ({ ...row, name: JSON.stringify(row.name) })));

await client.end();