# Import Data Files

Place legacy CSV files for import scripts in this folder.

## Prerequisites

1. Start Docker (`db` must be running).
2. Run migrations.
3. **`DATABASE_URL`** comes from the **repo root** `.env` (see `.env.example` and the [Contributing Guide](../../DOCS/CONTRIBUTING.md)). The import scripts load that file even when you run `cd backend && pnpm run import:*` (unlike plain `dotenv/config`, which only looks in the current working directory).

   The same Compose-style URL as in `.env.example` works for **local** runs: **`${DB_PORT}` is expanded** (plain `dotenv` does not interpolate it), and host **`db` is rewritten to `127.0.0.1`** when the script is not running inside a container. Inside Docker, `db` is left as-is. If you use a non-standard setup, set `DATABASE_URL` to a full URL yourself.

   For a **one-off** connection string (override `.env` or point at another DB), prefix the command: `DATABASE_URL="postgres://…" pnpm run import:productions` (same pattern as any other script that reads `process.env`).

## Available Importers

- `backend/scripts/import-productions-legacy.ts`
  - Default file: `data/imports/productions.csv`
  - Expected columns:
    - `Titel`
    - `Ondertitel`
    - `Description1`
    - `Description2`
    - `Genre`
    - `ID`
    - `Planning ID`
- `backend/scripts/import-events-legacy.ts`
  - Default file: `data/imports/events.csv`
  - Expected columns:
    - `Starttime`
    - `Endtime`
    - `Hall`
    - `Production`

## Run Order

1. Import productions first.
2. Import events second.

Events use `legacy_production_import_map` to resolve production foreign keys, so productions must already be imported.

## Run Examples

- Production import with default path:
  - `cd backend && pnpm run import:productions`
- Production import with positional path:
  - `cd backend && pnpm run import:productions -- "../data/imports/Productions - output.csv"`
- Production import with named path:
  - `cd backend && pnpm run import:productions -- --file "../data/imports/Productions - output.csv"`
- Event import with default path:
  - `cd backend && pnpm run import:events`
- Event import with custom path:
  - `cd backend && pnpm run import:events -- "../data/imports/Events - voorstellingen.csv"`

### Optional flags

Both importers accept these flags (after `--` when using `pnpm run …`):

- **`--dry-run`**: Parse the CSV and run validation / lookups only; **no rows are written** to the database (no `INSERT`/`UPDATE` for productions, events, halls, tags, or idempotency maps). Use this to check that the file path and column layout are correct before a real import.

- **`--limit <n>`**: Stop after processing **the first _n_ data rows** from the CSV (rows are still read in file order). Useful for a quick smoke test on a huge file without importing everything. Omit this flag to import the full file.

Examples:

```bash
# Productions: validate only, no DB writes
cd backend && pnpm run import:productions -- --dry-run

# Productions: import only the first 10 rows (writes to DB unless --dry-run)
cd backend && pnpm run import:productions -- --limit 10

# Combine: parse and validate 50 rows, but do not write
cd backend && pnpm run import:events -- "../data/imports/events.csv" --dry-run --limit 50
```

## Verification

After import, verify in the same Docker database:

- `docker exec -it viernulvier-db psql -U postgres -d postgres -c "SELECT (SELECT COUNT(*) FROM production) AS productions, (SELECT COUNT(*) FROM event) AS events, (SELECT COUNT(*) FROM hall) AS halls;"`

## Notes

- Importers handle quoted multiline CSV fields.
- Missing-value sentinels like `\N` and `null` are treated as empty values.
