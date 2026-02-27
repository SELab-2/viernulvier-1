import "dotenv/config";
import { migrate } from "../src/db/migrate.ts";

migrate()
  .then((result) => {
    console.log("Migration completed:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });