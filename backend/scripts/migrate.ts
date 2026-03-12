import "dotenv/config";
import { migrate } from "../src/db/migrate.js";

const target = process.argv[2] === "undefined" ? undefined : process.argv[2];
const migrationsPath = process.argv[3];

migrate(target, migrationsPath)
  .then(() => {
    console.log("Migration completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
