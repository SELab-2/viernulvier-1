# Import Data Files

Place legacy CSV files for import scripts in this folder.

## Prerequisites

1. Start Docker (`db` must be running).
2. Run migrations.
3. Run imports from `backend` with a `DATABASE_URL` that points to the same database you query with `docker exec`.

Example:

- `cd backend`
- `DATABASE_URL="postgres://postgres@localhost:5432/postgres" pnpm run migrate`

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
  - `cd backend && DATABASE_URL="postgres://postgres@localhost:5432/postgres" pnpm run import:productions`
- Production import with positional path:
  - `cd backend && DATABASE_URL="postgres://postgres@localhost:5432/postgres" pnpm run import:productions -- "../data/imports/Productions - output.csv"`
- Production import with named path:
  - `cd backend && DATABASE_URL="postgres://postgres@localhost:5432/postgres" pnpm run import:productions -- --file "../data/imports/Productions - output.csv"`
- Event import with default path:
  - `cd backend && DATABASE_URL="postgres://postgres@localhost:5432/postgres" pnpm run import:events`
- Event import with custom path:
  - `cd backend && DATABASE_URL="postgres://postgres@localhost:5432/postgres" pnpm run import:events -- "../data/imports/Events - voorstellingen.csv"`

Optional flags:

- `--dry-run`
- `--limit <n>`

## Verification

After import, verify in the same Docker database:

- `docker exec -it viernulvier-db psql -U postgres -d postgres -c "SELECT (SELECT COUNT(*) FROM production) AS productions, (SELECT COUNT(*) FROM event) AS events, (SELECT COUNT(*) FROM hall) AS halls;"`

## Notes

- Importers handle quoted multiline CSV fields.
- Missing-value sentinels like `\N` and `null` are treated as empty values.
