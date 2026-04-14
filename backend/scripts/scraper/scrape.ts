/**
 * Scraper environment (see also `auth.ts`, `local-api.ts`, `event.ts`):
 *
 * - `VIERNULVIER_API_TOKEN` — API key for `https://www.viernulvier.gent` (`X-AUTH-TOKEN`).
 * - `VIERNULVIER_LOCAL_API_URL` — own API base (default `http://localhost:3000`).
 * - `SCRAPER_ADMIN_USERNAME` / `SCRAPER_ADMIN_PASSWORD` — JWT login for protected `POST`s (defaults `admin` / `password`).
 * - `SCRAPE_EVENTS_WINDOW` — `historical` | `previous-brussels-day`.
 *
 * This entrypoint is events-only: halls and productions are imported lazily while processing each event.
 *
 * `VIERNULVIER_API_TOKEN` (and other vars) are read from the repository root `.env` (see `load-repo-env.ts`).
 */
import "./load-repo-env.js";
import {
  previousBrusselsDayBounds,
  scrapeAllEvents,
  type ViernulvierEventStartBounds,
} from "./event.js";

function readViernulvierApiToken(): string {
  const token = process.env["VIERNULVIER_API_TOKEN"];
  if (typeof token !== "string" || token.length === 0) {
    console.error("VIERNULVIER_API_TOKEN is not set in the environment variables.");
    process.exit(1);
  }
  return token;
}

/**
 * Which slice of the external events list to pull (`aanvang` bounds).
 *
 * - `historical` (default): `{ before: new Date() }` — past performances only (per API semantics).
 * - `previous-brussels-day`: half-open yesterday in Europe/Brussels.
 */
function resolveEventScrapeBounds(): ViernulvierEventStartBounds {
  const mode = process.env["SCRAPE_EVENTS_WINDOW"]?.trim() ?? "historical";
  if (mode === "historical") {
    return { before: new Date() };
  }
  if (mode === "previous-brussels-day") {
    return previousBrusselsDayBounds();
  }
  throw new Error(
    `Unknown SCRAPE_EVENTS_WINDOW=${JSON.stringify(mode)}. Use: historical | previous-brussels-day`,
  );
}

const viernulvierApiToken = readViernulvierApiToken();

async function main() {
  const eventBounds = resolveEventScrapeBounds();
  console.log(
    `Scraping events (lazy halls/productions)… window: ${process.env["SCRAPE_EVENTS_WINDOW"]?.trim() ?? "historical"}; after=${eventBounds.after?.toISOString() ?? "—"} before=${eventBounds.before?.toISOString() ?? "—"}`,
  );
  await scrapeAllEvents(viernulvierApiToken, eventBounds);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
