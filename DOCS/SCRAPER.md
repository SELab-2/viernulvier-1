# Scraper

This script imports Viernulvier events into the archive database.
It is a CLI entrypoint, so you run it from the `backend` package.

## Usage

Run the script from the `backend` directory:

```bash
pnpm run scrape
pnpm run scrape last
pnpm run scrape days 7
```

If you need to reach a backend running inside Docker without outside connection, run it inside that container instead:

```bash
docker compose exec backend pnpm run scrape days 7
```

## Prerequisites

The scraper needs access to:

- the external Viernulvier API
- the local backend API at `VIERNULVIER_LOCAL_API_URL` (default: `http://localhost:3000`)
- a valid `VIERNULVIER_API_TOKEN`

So it does not work fully standalone: the local API must be running somewhere, even if that is not on `localhost`.

## Modes

The scraper supports three modes.

### `historical`

This is the default when no mode is provided.

It fetches all events before the current midnight boundary and imports them into the archive database. Related objects such as halls, productions, and price tiers are imported lazily as they are encountered.

### `last`

This mode reads the previous run’s upper bound from the stats file and uses it as the lower bound for the next scrape.

It fetches events between that stored bound and the current midnight boundary.

If the previous bound cannot be read, the scraper falls back to `historical` mode.

### `days`

Use this mode as `pnpm run scrape days <n>`.

It fetches events from the last `<n>` days, using the current midnight boundary as the upper bound.

If `<n>` is missing, zero, negative, or not a number, the script exits with an error. There is no fallback for invalid `days` input.

## Environment variables

The script reads its configuration from the repository root `.env` file.

- `VIERNULVIER_API_TOKEN` - archive API token (`X-AUTH-TOKEN`)
- `VIERNULVIER_API_ORIGIN` - external archive API origin, default `https://www.viernulvier.gent`
- `VIERNULVIER_LOCAL_API_URL` - local API base URL, default `http://localhost:3000`
- `SCRAPER_ADMIN_USERNAME` / `SCRAPER_ADMIN_PASSWORD` - login used for protected `POST` requests, defaults `admin` / `password`
- `SCRAPE_EVENTS_WINDOW` - internal event window selector used by the script implementation

## Notes

- All modes use the current midnight boundary as the upper bound.
- The scraper is event-first: halls, productions, and prices are imported while events are processed.
- The script writes a run report after a successful scrape.