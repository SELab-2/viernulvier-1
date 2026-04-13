import {
  previousBrusselsDayBounds,
  scrapeAllEvents,
  type ViernulvierEventStartBounds,
} from "./event.js";
import { scrapeAllHalls } from "./hall.js";
import { scrapeAllProductions } from "./production.js";

function readViernulvierApiToken(): string {
  const token = process.env["VIERNULVIER_API_TOKEN"];
  if (typeof token !== "string" || token.length === 0) {
    console.error("VIERNULVIER_API_TOKEN is not set in the environment variables.");
    process.exit(1);
  }
  return token;
}

/**
 * Which slice of the external events list to pull (see `event.ts` / `ViernulvierEventStartBounds`).
 *
 * - `historical` (default): all events with start before “now” (UTC) -> initial full archive / re-runs are idempotent.
 * - `previous-brussels-day`: `[00:00 yesterday, 00:00 today)` in Europe/Brussels (venue/archive calendar).
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

/**
 * Import order: halls → productions → events. Event time window: env `SCRAPE_EVENTS_WINDOW`.
 */
async function main() {
  console.log("Scraping halls…");
  await scrapeAllHalls(viernulvierApiToken);
  console.log("Scraping productions…");
  await scrapeAllProductions(viernulvierApiToken);

  const eventBounds = resolveEventScrapeBounds();
  console.log(
    `Scraping events… (window: ${process.env["SCRAPE_EVENTS_WINDOW"]?.trim() ?? "historical"}; after=${eventBounds.after?.toISOString() ?? "—"} before=${eventBounds.before?.toISOString() ?? "—"})`,
  );
  await scrapeAllEvents(viernulvierApiToken, eventBounds);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
