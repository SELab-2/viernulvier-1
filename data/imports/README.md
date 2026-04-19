# Import Data Files

Place legacy CSV files for import scripts in this folder.

## Prerequisites

1. Start Docker (`db` must be running).
2. Run migrations.
3. **`DATABASE_URL`** comes from the **repo root** `.env` (see `.env.example` and the [Contributing Guide](../../DOCS/CONTRIBUTING.md)). The import scripts load that file even when you run `cd backend && pnpm run import:*` (unlike plain `dotenv/config`, which only looks in the current working directory).

   The same Compose-style URL as in `.env.example` works for **local** runs: **`${DB_PORT}` is expanded** (plain `dotenv` does not interpolate it), and host **`db` is rewritten to `127.0.0.1`** when the script is not running inside a container. Inside Docker, `db` is left as-is. If you use a non-standard setup, set `DATABASE_URL` to a full URL yourself.

   For a **one-off** connection string (override `.env` or point at another DB), prefix the command: `DATABASE_URL="postgres://…" pnpm run import:productions` (same pattern as any other script that reads `process.env`).

## Available Importers

- **CLI entry:** `backend/scripts/import-productions-legacy.ts` (thin wrapper; calls `importProductionsLegacy` in `src/legacy-import/import-productions-legacy.ts`)
  - Default file: `data/imports/productions.csv`
  - Expected columns:
    - `Titel`
    - `Ondertitel`
    - `Description1`
    - `Description2`
    - `Genre`
    - `ID`
    - `Planning ID`
- **CLI entry:** `backend/scripts/import-events-legacy.ts` → `importEventsLegacy` in `src/legacy-import/import-events-legacy.ts`
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

## How it works

### Productions import (`import-productions-legacy.ts`)

**Tag types first**

- Before processing rows, the script **gets or creates** two `tag_type` rows by Dutch name (case-insensitive match on `name->>'nl'`):
  - **`Tag`**: ensured so a default “Tag” category exists (aligned with the rest of the app).
  - **`Genre`**: required for genre tags; genre `tag` rows reference this type.
- If either is missing, it is **inserted** (unless `--dry-run`). Genre handling below always uses the **Genre** tag type.

**Row → `production`**

- Each row needs a non-empty **`ID`** (CSV column `ID`) as the **legacy production id**, and a non-empty **`Titel`**.
- Duplicate **`ID`** in the same file is skipped; rows whose legacy id is **already in the idempotency map** for this import source are skipped.
- If the database already has a production whose **`title`** and **`artist`** (CSV **`Titel`** / **`Ondertitel`**) match **any** language in the JSON `title` / `artist` columns (case-insensitive, trimmed) no new `production` row is inserted; only a **`legacy_production_import_map`** row is written so legacy ids still resolve for events. If **`Ondertitel`** is empty, “match” requires the existing row to have no non-empty **`artist`** text in any language.
- Otherwise a new row is inserted into **`production`** (titles/descriptions mapped into the JSON `jsonb` language fields as Dutch `nl` where applicable).

**Genres → `tag` + `production_tag`**

- The **`Genre`** column may list **several genres separated by commas**. Each part is trimmed and deduplicated.
- For each genre name, the script looks for an existing **`tag`** with that name in **any** language field on **`name`** (case-insensitive) and **`tag_type`** = the Genre tag type.
  - If **found**, that tag id is reused.
  - If **not found**, a new **`tag`** is created (`tag_type` = Genre, `public` = true) and cached for the rest of the run.
- Each production is linked with **`INSERT INTO production_tag (production, tag) … ON CONFLICT DO NOTHING`** so duplicate links are harmless.

**Legacy id map**

- After a successful insert, the script stores **`(source, legacy_id) → production_id`** in **`legacy_production_import_map`**.
  - **`source`** for this CSV is the fixed string **`productions-output-csv`** (see `LEGACY_PRODUCTION_IMPORT_SOURCE` in `src/legacy-import/import-productions-legacy.ts`).
- The events importer **only** reads mappings with this same source when resolving the **`Production`** column.

### Events import (`import-events-legacy.ts`)

**Dependencies**

- The table **`legacy_production_import_map` must exist** and must contain rows for **`source = productions-output-csv`**. Otherwise the script errors: run **productions** import in **write** mode first.
- The script creates **`legacy_event_import_map`** if needed (same pattern as productions’ map).

**Row identity (idempotency)**

- Each CSV row gets a deterministic **`legacy_key`**: a **SHA-1** hash of the concatenation of **`Starttime` | `Endtime` | `Hall` | `Production`** (normalized fields). That key is used with **`source = events-voorstellingen-csv`** (`LEGACY_EVENT_IMPORT_SOURCE`) in **`legacy_event_import_map`** so re-imports skip already-imported rows.

**Halls**

- **`Hall`** is parsed as **`name`** and optional **`address`**: if there is a comma, text before the first comma is the name and the rest is the address; otherwise the whole value is the name and address is empty.
- Halls are matched if the CSV hall name equals **any** language string on **`hall.name`** (case-insensitive). If a hall exists, it is reused; if the CSV has a non-empty address and the DB row had an empty address, the address may be **updated**.
- If no hall exists, a new **`hall`** row is inserted (`name` as JSON `nl`, plain `address` column).

**Link to production**

- The **`Production`** cell is the **legacy production id** (same value as productions CSV **`ID`**). It is **not** the numeric `production.id` in Postgres.
- The script loads **`legacy_production_import_map`** for **`productions-output-csv`** into memory and maps that string → **`production_id`**. If there is no mapping, the row is skipped as an unknown production.

**Event row**

- **`event.starts_at`** comes from **`Starttime`** (invalid / empty / sentinel datetimes are skipped). **`ends_at`** uses **`Endtime`** when valid, otherwise it defaults to **`starts_at`**. **`doors_at`** is set equal to **`starts_at`** for this import.
- The new **`event`** references **`production`** and **`hall`** by the resolved ids above. On success, **`legacy_event_import_map`** stores **`(source, legacy_key, event_id)`**.

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
