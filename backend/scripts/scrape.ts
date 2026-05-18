/**
 * Thin CLI entry for the archive scraper. Implementation lives in `src/scraper/`.
 *
 * Environment (see `src/scraper/core/auth.ts`, `local-api.ts`, `event.ts`):
 *
 * - `VIERNULVIER_API_TOKEN` — API key for the archive API (`X-AUTH-TOKEN`).
 * - `VIERNULVIER_API_ORIGIN` — archive API origin (default `https://www.viernulvier.gent`).
 * - `VIERNULVIER_LOCAL_API_URL` — own API base (default `http://localhost:3000`).
 * - `SCRAPER_ADMIN_USERNAME` / `SCRAPER_ADMIN_PASSWORD` — JWT login for protected `POST`s (defaults `admin` / `password`).
 *
 * This entrypoint is events-only: halls and productions are imported lazily while processing each event.
 *
 * CLI Arguments:
 * - `historical` (default): scrape all past events (no lower bound).
 * - `last`: scrape since the upper bound of the last run (from stats file).
 * - `days <N>`: scrape events from the past N days.
 *
 * `VIERNULVIER_API_TOKEN` (and other vars) are read from the repository root `.env` (see `src/scraper/core/load-repo-env.ts`).
 */
import "@/scraper/core/load-repo-env.js";
import {
  resolveScrapeBoundsFromArgs,
  formatRunReport,
  resolveScrapeStatsOutputPath,
  writeRunReportFile,
} from "@/scraper/core/index.js";
import { scrapeAllEvents } from "@/scraper/entities/index.js";

function readViernulvierApiToken(): string {
  const token = process.env["VIERNULVIER_API_TOKEN"];
  if (typeof token !== "string" || token.length === 0) {
    console.error("VIERNULVIER_API_TOKEN is not set in the environment variables.");
    process.exit(1);
  }
  return token;
}

const viernulvierApiToken = readViernulvierApiToken();

async function main() {
  const { bounds: eventBounds, label: windowLabel } = await resolveScrapeBoundsFromArgs();
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
