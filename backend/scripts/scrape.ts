/**
 * Thin CLI entry for the archive scraper. Implementation lives in `src/scraper/`.
 *
 * Environment (see `src/scraper/auth.ts`, `local-api.ts`, `event.ts`):
 *
 * - `VIERNULVIER_API_TOKEN` — API key for the archive API (`X-AUTH-TOKEN`).
 * - `VIERNULVIER_API_ORIGIN` — archive API origin (default `https://www.viernulvier.gent`).
 * - `VIERNULVIER_LOCAL_API_URL` — own API base (default `http://localhost:3000`).
 * - `SCRAPER_ADMIN_USERNAME` / `SCRAPER_ADMIN_PASSWORD` — JWT login for protected `POST`s (defaults `admin` / `password`).
 * - `SCRAPE_EVENTS_WINDOW` — `historical` | `previous-brussels-day`.
 *
 * This entrypoint is events-only: halls and productions are imported lazily while processing each event.
 *
 * `VIERNULVIER_API_TOKEN` (and other vars) are read from the repository root `.env` (see `src/scraper/load-repo-env.ts`).
 */
import "@/scraper/load-repo-env.js";
import {
  previousBrusselsDayBounds,
  scrapeAllEvents,
  type ViernulvierEventStartBounds,
} from "@/scraper/event.js";
import {
  formatRunReport,
  resolveScrapeStatsOutputPath,
  writeRunReportFile,
} from "@/scraper/scrape-stats.js";

function readViernulvierApiToken(): string {
  const token = process.env["VIERNULVIER_API_TOKEN"];
  if (typeof token !== "string" || token.length === 0) {
    console.error("VIERNULVIER_API_TOKEN is not set in the environment variables.");
    process.exit(1);
  }
  return token;
}

/**
 * Which slice of the external events list to pull (`starts_at` query bounds).
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
  const windowLabel = process.env["SCRAPE_EVENTS_WINDOW"]?.trim() ?? "historical";
  const eventBounds = resolveEventScrapeBounds();
  console.log(
    `Scraping events (lazy halls/productions)… window: ${windowLabel}; after=${eventBounds.after?.toISOString() ?? "—"} before=${eventBounds.before?.toISOString() ?? "—"}`,
  );
  const stats = await scrapeAllEvents(viernulvierApiToken, eventBounds);
  const report = formatRunReport(stats, { windowLabel, bounds: eventBounds });
  const statsPath = resolveScrapeStatsOutputPath();
  await writeRunReportFile(report, statsPath);
  console.log(`Scrape stats written to ${statsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
