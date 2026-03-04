import "dotenv/config";
import { migrate } from "../src/db/migrate.ts";

migrate(process.argv[2])
  .then(() => {
    console.log("Migration completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
